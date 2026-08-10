import { batch } from "@vaakx-dev/vrui";

import {
  comparePinnedThreads,
  objectValue,
  selectProviderOption,
  type AgentThread,
  type AgentThreadSummary,
  type JsonObject,
} from "@sand/extension-api";

import {
  findModel,
  findProvider,
  firstModel,
} from "../modelCatalog.ts";
import type { WorkbenchState } from "../state.ts";
import { ControllerRuntime } from "./runtime.ts";
import { clearThread } from "./thread.ts";
import { upsertThread } from "./threadSummary.ts";

export class AgentController {
  constructor(
    private readonly runtime: ControllerRuntime,
    private readonly onThreadOpen: () => void | Promise<void>,
  ) {}

  async sendPrompt(): Promise<void> {
    const state = this.runtime.state;
    const prompt = state.prompt.get().trim();
    if (!prompt || state.agentStatus.get() === "running") return;
    state.prompt.set("");
    state.agentDelta.set("");
    await this.runtime.guard(async () => {
      const thread = await this.runtime.call<AgentThread>("orchestration.start", {
        prompt,
        provider: state.provider.get(),
        model: state.model.get(),
        threadId: state.threadId.get(),
      });
      batch(() => {
        state.threadId.set(thread.id);
        state.messages.set(thread.messages);
        state.runs.set(thread.runs ?? []);
        state.attempts.set(thread.attempts ?? []);
        state.agentStatus.set(thread.status);
        state.threads.update((threads) => [
          threadSummary(thread),
          ...threads.filter((item) => item.id !== thread.id),
        ]);
      });
      this.runtime.context.ui.events.emit("workbench.thread.changed", { threadId: thread.id });
    });
  }

  async cancel(): Promise<void> {
    const threadId = this.runtime.state.threadId.get();
    if (!threadId) return;
    await this.runtime.call("orchestration.cancel", { threadId });
  }

  newThread(): void {
    clearThread(this.runtime.state);
    this.runtime.context.ui.events.emit("workbench.thread.changed", { threadId: null });
  }

  async openThread(id: string): Promise<void> {
    const state = this.runtime.state;
    await this.runtime.guard(async () => {
      const thread = await this.runtime.call<AgentThread>("orchestration.thread", { id });
      batch(() => {
        state.threadId.set(thread.id);
        state.messages.set(thread.messages);
        state.runs.set(thread.runs ?? []);
        state.attempts.set(thread.attempts ?? []);
        state.provider.set(thread.provider);
        state.model.set(thread.model);
        restoreOptions(state, thread.provider, thread.model);
        state.agentStatus.set(thread.status);
        state.agentDelta.set("");
      });
      this.replaceSummary(await this.runtime.call<AgentThreadSummary>("orchestration.thread.visit", {
        threadId: id,
      }));
      this.runtime.context.ui.events.emit("workbench.thread.changed", { threadId: id });
    });
    await this.onThreadOpen();
  }

  async pinThread(id: string, pinned: boolean): Promise<void> {
    await this.runtime.guard(async () => {
      const summary = await this.runtime.call<AgentThreadSummary>("orchestration.thread.pin", {
        threadId: id,
        pinned,
      });
      this.replaceSummary(summary);
    });
  }

  async reorderPin(id: string, beforeId?: string): Promise<void> {
    await this.runtime.guard(async () => {
      const changed = await this.runtime.call<AgentThreadSummary[]>("orchestration.thread.pin.reorder", {
        threadId: id,
        ...(beforeId ? { beforeId } : {}),
      });
      const replacements = new Map(changed.map((summary) => [summary.id, summary]));
      this.runtime.state.threads.update((threads) =>
        threads.map((thread) => replacements.get(thread.id) ?? thread),
      );
    });
  }

  async movePin(id: string, direction: "up" | "down"): Promise<void> {
    const pins = this.runtime.state.threads.get().filter((thread) => thread.pinned)
      .sort(comparePinnedThreads);
    const index = pins.findIndex((thread) => thread.id === id);
    if (index < 0) return;
    if (direction === "up") {
      const before = pins[index - 1];
      if (before) await this.reorderPin(id, before.id);
      return;
    }
    const afterNext = pins[index + 2];
    if (pins[index + 1]) await this.reorderPin(id, afterNext?.id);
  }

  async settleThread(id: string, settled: boolean): Promise<void> {
    await this.runtime.guard(async () => {
      const summary = await this.runtime.call<AgentThreadSummary>("orchestration.thread.settle", {
        threadId: id,
        settled,
      });
      this.replaceSummary(summary);
    });
  }

  beginRename(thread: AgentThreadSummary): void {
    const state = this.runtime.state;
    state.threadMenu.set(null);
    state.threadRename.set({ id: thread.id, title: thread.title });
    state.threadRenameInput.set(thread.title);
  }

  async renameThread(): Promise<void> {
    const state = this.runtime.state;
    const target = state.threadRename.get();
    const title = state.threadRenameInput.get().trim();
    if (!target || !title) return;
    await this.runtime.guard(async () => {
      const summary = await this.runtime.call<AgentThreadSummary>("orchestration.thread.rename", {
        threadId: target.id,
        title,
      });
      this.replaceSummary(summary);
      state.threadRename.set(null);
    });
  }

  async setUnread(id: string, unread: boolean): Promise<void> {
    await this.runtime.guard(async () => {
      this.replaceSummary(await this.runtime.call<AgentThreadSummary>("orchestration.thread.unread", {
        threadId: id,
        unread,
      }));
    });
  }

  async snoozeThread(id: string, until?: string): Promise<void> {
    await this.runtime.guard(async () => {
      this.replaceSummary(await this.runtime.call<AgentThreadSummary>("orchestration.thread.snooze", {
        threadId: id,
        ...(until ? { until } : {}),
      }));
      this.runtime.state.threadMenu.set(null);
      this.runtime.state.threadSnoozeOpen.set(false);
    });
  }

  async deleteThread(id: string): Promise<void> {
    await this.runtime.guard(async () => {
      await this.runtime.call("orchestration.thread.delete", { threadId: id });
      const state = this.runtime.state;
      state.threads.update((threads) => threads.filter((thread) => thread.id !== id));
      if (state.threadId.get() === id) this.newThread();
      state.threadMenu.set(null);
    });
  }

  async selectProvider(id: string): Promise<void> {
    const state = this.runtime.state;
    const provider = findProvider(state.providers.get(), id);
    const model = firstModel(state.providerModels.get(), provider);
    await this.selectModel(id, model?.slug || provider?.defaultModel || "");
  }

  async saveModel(): Promise<void> {
    await this.runtime.saveOne("workbench.model", this.runtime.state.model.get());
  }

  async selectModel(provider: string, model: string): Promise<void> {
    const state = this.runtime.state;
    batch(() => {
      state.provider.set(provider);
      state.model.set(model);
      restoreOptions(state, provider, model);
      state.modelPickerOpen.set(false);
      state.modelQuery.set("");
    });
    await Promise.all([
      this.runtime.saveOne("workbench.provider", provider),
      this.runtime.saveOne("workbench.model", model),
    ]);
    await this.saveOptions();
  }

  async saveOptions(): Promise<void> {
    const state = this.runtime.state;
    const key = `provider.${state.provider.get()}`;
    const current = objectValue(state.settings.get()[key] ?? null);
    const next: JsonObject = {
      ...current,
      reasoning: state.reasoning.get(),
      serviceTier: state.serviceTier.get(),
    };
    state.settings.set(await this.runtime.saveOne(key, next));
  }

  private replaceSummary(summary: AgentThreadSummary): void {
    upsertThread(this.runtime.state, summary);
  }
}

function restoreOptions(state: WorkbenchState, providerId: string, slug: string): void {
  const provider = findProvider(state.providers.get(), providerId);
  const model = findModel(state.providerModels.get(), providerId, slug);
  const settings = objectValue(state.settings.get()[`provider.${providerId}`] ?? null);
  const reasoning = model?.reasoning ?? provider?.modelDefaults.reasoning ?? [];
  const serviceTiers = model?.serviceTiers ?? provider?.modelDefaults.serviceTiers ?? [];
  state.reasoning.set(selectProviderOption(
    settings.reasoning,
    reasoning,
    model?.defaultReasoning ?? provider?.modelDefaults.defaultReasoning ?? "",
  ));
  state.serviceTier.set(selectProviderOption(
    settings.serviceTier,
    serviceTiers,
    model?.defaultServiceTier ?? provider?.modelDefaults.defaultServiceTier ?? "",
  ));
}

function threadSummary({ messages: _messages, ...summary }: AgentThread): AgentThreadSummary {
  return summary;
}

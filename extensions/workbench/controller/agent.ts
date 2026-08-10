import { batch } from "@vaakx-dev/vrui";

import {
  comparePinnedThreads,
  errorMessage,
  objectValue,
  type AgentSessionSummary,
  type JsonObject,
} from "@sand/extension-api";

import type { AgentSession, ChatGptAuth } from "../models.ts";
import { ControllerRuntime } from "./runtime.ts";
import { clearSession } from "./session.ts";
import { upsertSession } from "./sessionSummary.ts";

export class AgentController {
  constructor(
    private readonly runtime: ControllerRuntime,
    private readonly onSessionOpen: () => void | Promise<void>,
  ) {}

  async sendPrompt(): Promise<void> {
    const state = this.runtime.state;
    const prompt = state.prompt.get().trim();
    if (!prompt || state.agentStatus.get() === "running") return;
    state.prompt.set("");
    state.agentDelta.set("");
    await this.runtime.guard(async () => {
      const session = await this.runtime.call<AgentSession>("agent.start", {
        prompt,
        provider: state.provider.get(),
        model: state.model.get(),
        sessionId: state.sessionId.get(),
      });
      batch(() => {
        state.sessionId.set(session.id);
        state.messages.set(session.messages);
        state.agentStatus.set(session.status);
        state.sessions.update((sessions) => [
          sessionSummary(session),
          ...sessions.filter((item) => item.id !== session.id),
        ]);
      });
    });
  }

  async cancel(): Promise<void> {
    const sessionId = this.runtime.state.sessionId.get();
    if (!sessionId) return;
    await this.runtime.call("agent.cancel", { sessionId });
  }

  newSession(): void {
    clearSession(this.runtime.state);
  }

  async openSession(id: string): Promise<void> {
    const state = this.runtime.state;
    await this.runtime.guard(async () => {
      const session = await this.runtime.call<AgentSession>("agent.session", { id });
      batch(() => {
        state.sessionId.set(session.id);
        state.messages.set(session.messages);
        state.provider.set(session.provider);
        state.model.set(session.model);
        state.agentStatus.set(session.status);
        state.agentDelta.set("");
        state.tools.set([]);
        state.planDescription.set("");
        state.planSteps.set([]);
        state.planUpdatedAt.set("");
      });
      this.replaceSummary(await this.runtime.call<AgentSessionSummary>("agent.visit", {
        sessionId: id,
      }));
    });
    await this.onSessionOpen();
  }

  async pinSession(id: string, pinned: boolean): Promise<void> {
    await this.runtime.guard(async () => {
      const summary = await this.runtime.call<AgentSessionSummary>("agent.pin", {
        sessionId: id,
        pinned,
      });
      this.replaceSummary(summary);
    });
  }

  async reorderPin(id: string, beforeId?: string): Promise<void> {
    await this.runtime.guard(async () => {
      const changed = await this.runtime.call<AgentSessionSummary[]>("agent.pin.reorder", {
        sessionId: id,
        ...(beforeId ? { beforeId } : {}),
      });
      const replacements = new Map(changed.map((summary) => [summary.id, summary]));
      this.runtime.state.sessions.update((sessions) =>
        sessions.map((session) => replacements.get(session.id) ?? session),
      );
    });
  }

  async movePin(id: string, direction: "up" | "down"): Promise<void> {
    const pins = this.runtime.state.sessions.get().filter((session) => session.pinned)
      .sort(comparePinnedThreads);
    const index = pins.findIndex((session) => session.id === id);
    if (index < 0) return;
    if (direction === "up") {
      const before = pins[index - 1];
      if (before) await this.reorderPin(id, before.id);
      return;
    }
    const afterNext = pins[index + 2];
    if (pins[index + 1]) await this.reorderPin(id, afterNext?.id);
  }

  async settleSession(id: string, settled: boolean): Promise<void> {
    await this.runtime.guard(async () => {
      const summary = await this.runtime.call<AgentSessionSummary>("agent.settle", {
        sessionId: id,
        settled,
      });
      this.replaceSummary(summary);
    });
  }

  beginRename(session: AgentSessionSummary): void {
    const state = this.runtime.state;
    state.threadMenu.set(null);
    state.threadRename.set({ id: session.id, title: session.title });
    state.threadRenameInput.set(session.title);
  }

  async renameSession(): Promise<void> {
    const state = this.runtime.state;
    const target = state.threadRename.get();
    const title = state.threadRenameInput.get().trim();
    if (!target || !title) return;
    await this.runtime.guard(async () => {
      const summary = await this.runtime.call<AgentSessionSummary>("agent.rename", {
        sessionId: target.id,
        title,
      });
      this.replaceSummary(summary);
      state.threadRename.set(null);
    });
  }

  async setUnread(id: string, unread: boolean): Promise<void> {
    await this.runtime.guard(async () => {
      this.replaceSummary(await this.runtime.call<AgentSessionSummary>("agent.unread", {
        sessionId: id,
        unread,
      }));
    });
  }

  async snoozeSession(id: string, until?: string): Promise<void> {
    await this.runtime.guard(async () => {
      this.replaceSummary(await this.runtime.call<AgentSessionSummary>("agent.snooze", {
        sessionId: id,
        ...(until ? { until } : {}),
      }));
      this.runtime.state.threadMenu.set(null);
      this.runtime.state.threadSnoozeOpen.set(false);
    });
  }

  async deleteSession(id: string): Promise<void> {
    await this.runtime.guard(async () => {
      await this.runtime.call("agent.delete", { sessionId: id });
      const state = this.runtime.state;
      state.sessions.update((sessions) => sessions.filter((session) => session.id !== id));
      if (state.sessionId.get() === id) this.newSession();
      state.threadMenu.set(null);
    });
  }

  async selectProvider(id: string): Promise<void> {
    const state = this.runtime.state;
    const provider = state.providers.get().find((item) => item.id === id);
    state.provider.set(id);
    const catalog = state.providerModels.get()[id] ?? [];
    state.model.set(catalog.find((model) => !model.hidden)?.slug || provider?.defaultModel || "");
    await Promise.all([
      this.runtime.saveOne("workbench.provider", id),
      this.runtime.saveOne("workbench.model", state.model.get()),
    ]);
  }

  async saveModel(): Promise<void> {
    await this.runtime.saveOne("workbench.model", this.runtime.state.model.get());
  }

  async selectModel(provider: string, model: string): Promise<void> {
    const state = this.runtime.state;
    batch(() => {
      state.provider.set(provider);
      state.model.set(model);
      state.modelPickerOpen.set(false);
      state.modelQuery.set("");
    });
    await Promise.all([
      this.runtime.saveOne("workbench.provider", provider),
      this.runtime.saveOne("workbench.model", model),
    ]);
  }

  async saveOptions(): Promise<void> {
    const state = this.runtime.state;
    const current = objectValue(state.settings.get()["provider.chatgpt"] ?? null);
    const next: JsonObject = {
      ...current,
      reasoning: state.reasoning.get(),
      serviceTier: state.serviceTier.get(),
    };
    state.settings.set(await this.runtime.saveOne("provider.chatgpt", next));
  }

  async login(): Promise<void> {
    const state = this.runtime.state;
    if (state.authBusy.get()) return;
    state.authBusy.set(true);
    this.runtime.notice("Complete the ChatGPT sign-in in your browser");
    try {
      const status = await this.runtime.command<ChatGptAuth>("chatgpt.auth.login");
      state.chatgptAuth.set(status);
      if (status.authenticated) {
        await this.selectProvider("chatgpt");
        this.runtime.notice("Signed in with ChatGPT");
      }
    } catch (error) {
      this.runtime.notice(errorMessage(error));
    } finally {
      state.authBusy.set(false);
    }
  }

  async logout(): Promise<void> {
    await this.runtime.guard(async () => {
      this.runtime.state.chatgptAuth.set(
        await this.runtime.command<ChatGptAuth>("chatgpt.auth.logout"),
      );
      this.runtime.notice("Signed out of ChatGPT");
    });
  }

  private replaceSummary(summary: AgentSessionSummary): void {
    upsertSession(this.runtime.state, summary);
  }
}

function sessionSummary({ messages: _messages, ...summary }: AgentSession): AgentSessionSummary {
  return summary;
}

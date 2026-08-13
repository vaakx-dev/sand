import {
  comparePinnedThreads,
  type AgentThread,
  type AgentThreadSummary,
} from "@sand/extension-api";

import { workbenchEvents } from "../api.ts";
import { ControllerRuntime } from "../controller/runtime.ts";
import { SelectionController } from "../controller/selection.ts";
import { applyThread, clearThread } from "./selection.ts";
import { upsertThread } from "./summary.ts";

export class ThreadController {
  constructor(
    private readonly runtime: ControllerRuntime,
    private readonly selection: SelectionController,
  ) {}

  new(): void {
    clearThread(this.runtime.state);
    this.runtime.workbench.events.emit(workbenchEvents.threadChanged, { threadId: null });
  }

  async open(id: string): Promise<void> {
    await this.runtime.guard(async () => {
      const thread = await this.runtime.call<AgentThread>("threads.get", { id });
      applyThread(this.runtime.state, thread);
      this.selection.restore(thread.provider, thread.model);
      this.replace(await this.runtime.command<AgentThreadSummary>("threads.visit", {
        threadId: id,
      }));
      this.runtime.workbench.events.emit(workbenchEvents.threadChanged, { threadId: id });
    });
  }

  async pin(id: string, pinned: boolean): Promise<void> {
    await this.runtime.guard(async () => {
      this.replace(await this.runtime.command<AgentThreadSummary>("threads.pin", {
        threadId: id,
        pinned,
      }));
    });
  }

  async reorderPin(id: string, beforeId?: string): Promise<void> {
    await this.runtime.guard(async () => {
      const changed = await this.runtime.command<AgentThreadSummary[]>(
        "threads.pin.reorder",
        { threadId: id, ...(beforeId ? { beforeId } : {}) },
      );
      const replacements = new Map(changed.map((summary) => [summary.id, summary]));
      this.runtime.state.threads.items.update((threads) =>
        threads.map((thread) => replacements.get(thread.id) ?? thread)
      );
    });
  }

  async movePin(id: string, direction: "up" | "down"): Promise<void> {
    const pins = this.runtime.state.threads.items.get().filter((thread) => thread.pinned)
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

  async settle(id: string, settled: boolean): Promise<void> {
    await this.runtime.guard(async () => {
      this.replace(await this.runtime.command<AgentThreadSummary>("threads.settle", {
        threadId: id,
        settled,
      }));
    });
  }

  beginRename(thread: AgentThreadSummary): void {
    const state = this.runtime.state;
    state.threads.menu.set(null);
    state.threads.rename.set({ id: thread.id, title: thread.title });
    state.threads.renameInput.set(thread.title);
  }

  async rename(): Promise<void> {
    const state = this.runtime.state;
    const target = state.threads.rename.get();
    const title = state.threads.renameInput.get().trim();
    if (!target || !title) return;
    await this.runtime.guard(async () => {
      this.replace(await this.runtime.command<AgentThreadSummary>("threads.rename", {
        threadId: target.id,
        title,
      }));
      state.threads.rename.set(null);
    });
  }

  async setUnread(id: string, unread: boolean): Promise<void> {
    await this.runtime.guard(async () => {
      this.replace(await this.runtime.command<AgentThreadSummary>("threads.unread", {
        threadId: id,
        unread,
      }));
    });
  }

  async snooze(id: string, until?: string): Promise<void> {
    await this.runtime.guard(async () => {
      this.replace(await this.runtime.command<AgentThreadSummary>("threads.snooze", {
        threadId: id,
        ...(until ? { until } : {}),
      }));
      this.runtime.state.threads.menu.set(null);
    });
  }

  async delete(id: string): Promise<void> {
    await this.runtime.guard(async () => {
      await this.runtime.command("threads.delete", { threadId: id });
      const state = this.runtime.state;
      state.threads.items.update((threads) => threads.filter((thread) => thread.id !== id));
      if (state.threads.current.get() === id) this.new();
      state.threads.menu.set(null);
    });
  }

  private replace(summary: AgentThreadSummary): void {
    upsertThread(this.runtime.state.threads, summary);
  }
}

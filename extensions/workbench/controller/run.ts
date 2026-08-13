import { batch } from "@vaakx-dev/vrui";

import type { AgentThread, AgentThreadSummary } from "@sand/extension-api";

import { workbenchEvents } from "../api.ts";
import { ControllerRuntime } from "./runtime.ts";
import { SelectionController } from "./selection.ts";
import { applyThread, threadSummary } from "../threads/selection.ts";
import { upsertThread } from "../threads/summary.ts";

export class RunController {
  constructor(
    private readonly runtime: ControllerRuntime,
    private readonly selection: SelectionController,
  ) {}

  async send(): Promise<void> {
    const state = this.runtime.state;
    const prompt = state.threads.prompt.get().trim();
    if (!prompt) return;
    if (state.threads.status.get() === "running") {
      await this.queue(prompt);
      return;
    }
    await this.runtime.guard(async () => {
      const thread = await this.runtime.command<AgentThread>("agent.run.start", {
        prompt,
        provider: state.provider.get(),
        model: state.model.get(),
        threadId: state.threads.current.get(),
      });
      this.load(thread);
      state.threads.prompt.set("");
      this.runtime.workbench.events.emit(workbenchEvents.threadChanged, { threadId: thread.id });
    });
  }

  async steer(): Promise<void> {
    const state = this.runtime.state;
    const threadId = state.threads.current.get();
    const prompt = state.threads.prompt.get().trim();
    if (!threadId || !prompt || state.threads.status.get() !== "running") return;
    await this.runtime.guard(async () => {
      const thread = await this.runtime.command<AgentThread>("agent.run.steer", {
        threadId,
        prompt,
      });
      this.load(thread);
      state.threads.prompt.set("");
    });
  }

  async cancel(): Promise<void> {
    const threadId = this.runtime.state.threads.current.get();
    if (!threadId) return;
    await this.runtime.guard(async () => {
      await this.runtime.command("agent.run.cancel", { threadId });
    });
  }

  async recover(): Promise<void> {
    const state = this.runtime.state;
    const threadId = state.threads.current.get();
    if (!threadId || state.threads.status.get() !== "interrupted") return;
    await this.runtime.guard(async () => {
      this.load(await this.runtime.command<AgentThread>("agent.run.recover", { threadId }));
    });
  }

  private async queue(prompt: string): Promise<void> {
    const state = this.runtime.state;
    const threadId = state.threads.current.get();
    if (!threadId) return;
    await this.runtime.guard(async () => {
      const summary = await this.runtime.command<AgentThreadSummary>("agent.run.queue", {
        threadId,
        prompt,
        provider: state.provider.get(),
        model: state.model.get(),
      });
      batch(() => {
        state.threads.prompt.set("");
        state.threads.queue.set(summary.queuedTurns ?? []);
      });
      upsertThread(state.threads, summary);
    });
  }

  private load(thread: AgentThread): void {
    const state = this.runtime.state;
    applyThread(state, thread);
    this.selection.restore(thread.provider, thread.model);
    upsertThread(state.threads, threadSummary(thread));
  }
}

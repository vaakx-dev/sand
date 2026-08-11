import {
  errorMessage,
  objectValue,
  stringValue,
  type AgentAttempt,
  type AgentMessage,
  type AgentQueuedTurn,
  type AgentRun,
  type AgentThreadSummary,
  type JsonObject,
  type RuntimeEvent,
} from "@sand/extension-api";

import { ControllerRuntime } from "./runtime.ts";
import { initializeWorkbench } from "./initialize.ts";
import { workbenchEvents } from "../api.ts";
import { clearThread } from "../threads/selection.ts";
import { upsertThread } from "../threads/summary.ts";

export class WorkbenchEvents {
  constructor(private readonly runtime: ControllerRuntime) {}

  start(): void {
    this.runtime.context.runtime.subscribe((event) => this.onEvent(event));
    this.runtime.context.runtime.subscribeWorkspace(() => void this.selectWorkspace());
  }

  private onEvent(event: RuntimeEvent): void {
    const state = this.runtime.state;
    const payload = objectValue(event.payload);
    const currentThread = state.threads.current.get();
    const threadId = stringValue(payload.threadId);
    const belongsToCurrent = !threadId || threadId === currentThread;

    switch (event.kind) {
      case "agent.delta":
        if (belongsToCurrent) {
          state.threads.delta.update((value) => value + stringValue(payload.delta));
        }
        break;
      case "agent.delta.reset":
        if (belongsToCurrent) state.threads.delta.set("");
        break;
      case "agent.message":
        if (belongsToCurrent) this.addMessage(payload);
        break;
      case "agent.status":
        this.updateStatus(payload, threadId, belongsToCurrent);
        break;
      case "threads.changed":
        this.updateThread(payload);
        break;
      case "threads.deleted":
        this.deleteThread(threadId);
        break;
      case "agent.error":
        if (belongsToCurrent) this.runtime.notice(stringValue(payload.message));
        break;
      case "agent.run":
        if (belongsToCurrent) this.updateRun(payload);
        break;
      case "agent.attempt":
        if (belongsToCurrent) this.updateAttempt(payload);
        break;
      case "agent.queue":
        if (belongsToCurrent) this.updateQueue(payload);
        break;
    }
  }

  private async selectWorkspace(): Promise<void> {
    const state = this.runtime.state;
    clearThread(state);
    state.threads.items.set([]);
    state.root.set(this.runtime.context.runtime.workspace().path);
    try {
      await initializeWorkbench(this.runtime);
      this.runtime.context.ui.events.emit(workbenchEvents.threadChanged, { threadId: null });
    } catch (error) {
      this.runtime.notice(errorMessage(error));
    }
  }

  private addMessage(payload: JsonObject): void {
    const state = this.runtime.state;
    const message = payload.message as unknown as AgentMessage;
    if (!message?.id) return;
    state.threads.messages.update((items) =>
      items.some((item) => item.id === message.id) ? items : [...items, message],
    );
    if (message.role === "assistant") state.threads.delta.set("");
  }

  private updateStatus(payload: JsonObject, threadId: string, current: boolean): void {
    const state = this.runtime.state;
    const status = (stringValue(payload.status) || "idle") as AgentThreadSummary["status"];
    if (current) state.threads.status.set(status);
    if (!threadId) return;
    state.threads.items.update((threads) => threads.map((thread) =>
      thread.id === threadId
        ? {
            ...thread,
            status,
            updatedAt: new Date().toISOString(),
          }
        : thread
    ));
  }

  private updateThread(payload: JsonObject): void {
    const summary = payload.thread as unknown as AgentThreadSummary;
    if (!summary?.id) return;
    const state = this.runtime.state;
    upsertThread(state.threads, summary);
    if (state.threads.current.get() === summary.id) {
      state.threads.queue.set(summary.queuedTurns ?? []);
    }
  }

  private updateRun(payload: JsonObject): void {
    const run = payload.run as unknown as AgentRun;
    if (!run?.id) return;
    this.runtime.state.threads.runs.update((runs) => [
      ...runs.filter((item) => item.id !== run.id),
      run,
    ]);
  }

  private updateAttempt(payload: JsonObject): void {
    const attempt = payload.attempt as unknown as AgentAttempt;
    if (!attempt?.id) return;
    this.runtime.state.threads.attempts.update((attempts) => [
      ...attempts.filter((item) => item.id !== attempt.id),
      attempt,
    ]);
  }

  private updateQueue(payload: JsonObject): void {
    const queued = payload.queuedTurns as unknown as AgentQueuedTurn[];
    this.runtime.state.threads.queue.set(Array.isArray(queued) ? queued : []);
  }

  private deleteThread(id: string): void {
    if (!id) return;
    const state = this.runtime.state;
    state.threads.items.update((threads) => threads.filter((thread) => thread.id !== id));
    if (state.threads.current.get() === id) {
      clearThread(state);
    }
  }

}

import {
  objectValue,
  stringValue,
  type AgentAttempt,
  type AgentMessage,
  type AgentRun,
  type AgentThreadSummary,
  type JsonObject,
  type RuntimeEvent,
} from "@sand/extension-api";

import { GitController } from "./git.ts";
import { ControllerRuntime } from "./runtime.ts";
import { upsertThread } from "./threadSummary.ts";

export class WorkbenchEvents {
  constructor(
    private readonly runtime: ControllerRuntime,
    private readonly git: GitController,
  ) {}

  start(): void {
    this.runtime.context.runtime.subscribe((event) => this.onEvent(event));
  }

  private onEvent(event: RuntimeEvent): void {
    const state = this.runtime.state;
    const payload = objectValue(event.payload);
    const currentThread = state.threadId.get();
    const threadId = stringValue(payload.threadId);
    const belongsToCurrent = !threadId || threadId === currentThread;

    switch (event.kind) {
      case "orchestration.delta":
        if (belongsToCurrent) {
          state.agentDelta.update((value) => value + stringValue(payload.delta));
        }
        break;
      case "orchestration.message":
        if (belongsToCurrent) this.addMessage(payload);
        break;
      case "orchestration.status":
        this.updateStatus(payload, threadId, belongsToCurrent);
        break;
      case "orchestration.thread":
        this.updateThread(payload);
        break;
      case "orchestration.thread_deleted":
        this.deleteThread(threadId);
        break;
      case "orchestration.error":
        if (belongsToCurrent) this.runtime.notice(stringValue(payload.message));
        break;
      case "orchestration.run":
        if (belongsToCurrent) this.updateRun(payload);
        break;
      case "orchestration.attempt":
        if (belongsToCurrent) this.updateAttempt(payload);
        break;
      case "workspace.changed":
        void this.git.refresh();
        break;
    }
  }

  private addMessage(payload: JsonObject): void {
    const state = this.runtime.state;
    const message = payload.message as unknown as AgentMessage;
    if (!message?.id) return;
    state.messages.update((items) =>
      items.some((item) => item.id === message.id) ? items : [...items, message],
    );
    if (message.role === "assistant") state.agentDelta.set("");
  }

  private updateStatus(payload: JsonObject, threadId: string, current: boolean): void {
    const state = this.runtime.state;
    const status = (stringValue(payload.status) || "idle") as AgentThreadSummary["status"];
    if (current) state.agentStatus.set(status);
    if (!threadId) return;
    state.threads.update((threads) => threads.map((thread) =>
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
    upsertThread(this.runtime.state, summary);
  }

  private updateRun(payload: JsonObject): void {
    const run = payload.run as unknown as AgentRun;
    if (!run?.id) return;
    this.runtime.state.runs.update((runs) => [
      ...runs.filter((item) => item.id !== run.id),
      run,
    ]);
  }

  private updateAttempt(payload: JsonObject): void {
    const attempt = payload.attempt as unknown as AgentAttempt;
    if (!attempt?.id) return;
    this.runtime.state.attempts.update((attempts) => [
      ...attempts.filter((item) => item.id !== attempt.id),
      attempt,
    ]);
  }

  private deleteThread(id: string): void {
    if (!id) return;
    const state = this.runtime.state;
    state.threads.update((threads) => threads.filter((thread) => thread.id !== id));
    if (state.threadId.get() === id) {
      state.threadId.set(null);
      state.messages.set([]);
      state.runs.set([]);
      state.attempts.set([]);
    }
  }

}

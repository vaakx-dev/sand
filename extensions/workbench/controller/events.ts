import {
  objectValue,
  stringValue,
  type AgentMessage,
  type AgentSessionSummary,
  type JsonObject,
  type RuntimeEvent,
} from "@sand/extension-api";

import { GitController } from "./git.ts";
import { ControllerRuntime } from "./runtime.ts";
import { upsertSession } from "./sessionSummary.ts";

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
    const currentSession = state.sessionId.get();
    const sessionId = stringValue(payload.sessionId);
    const belongsToCurrent = !sessionId || sessionId === currentSession;

    switch (event.kind) {
      case "agent.delta":
        if (belongsToCurrent) {
          state.agentDelta.update((value) => value + stringValue(payload.delta));
        }
        break;
      case "agent.message":
        if (belongsToCurrent) this.addMessage(payload);
        break;
      case "agent.status":
        this.updateStatus(payload, sessionId, belongsToCurrent);
        break;
      case "agent.session":
        this.updateSession(payload);
        break;
      case "agent.session_deleted":
        this.deleteSession(sessionId);
        break;
      case "agent.error":
        if (belongsToCurrent) this.runtime.notice(stringValue(payload.message));
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

  private updateStatus(payload: JsonObject, sessionId: string, current: boolean): void {
    const state = this.runtime.state;
    const status = (stringValue(payload.status) || "idle") as AgentSessionSummary["status"];
    if (current) state.agentStatus.set(status);
    if (!sessionId) return;
    state.sessions.update((sessions) => sessions.map((session) =>
      session.id === sessionId
        ? {
            ...session,
            status,
            updatedAt: new Date().toISOString(),
          }
        : session
    ));
  }

  private updateSession(payload: JsonObject): void {
    const summary = payload.session as unknown as AgentSessionSummary;
    if (!summary?.id) return;
    upsertSession(this.runtime.state, summary);
  }

  private deleteSession(id: string): void {
    if (!id) return;
    const state = this.runtime.state;
    state.sessions.update((sessions) => sessions.filter((session) => session.id !== id));
    if (state.sessionId.get() === id) {
      state.sessionId.set(null);
      state.messages.set([]);
    }
  }

}

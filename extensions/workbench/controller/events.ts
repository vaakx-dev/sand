import {
  objectValue,
  stringValue,
  type AgentMessage,
  type AgentSessionSummary,
  type JsonObject,
  type RuntimeEvent,
} from "@sand/extension-api";

import type { PlanStep, ToolActivity } from "../models.ts";
import { openPanel } from "../panel.ts";
import { GitController } from "./git.ts";
import { ControllerRuntime } from "./runtime.ts";
import { upsertSession } from "./sessionSummary.ts";
import { TerminalController } from "./terminal.ts";
import { WorkspaceController } from "./workspace.ts";

export class WorkbenchEvents {
  constructor(
    private readonly runtime: ControllerRuntime,
    private readonly workspace: WorkspaceController,
    private readonly git: GitController,
    private readonly terminal: TerminalController,
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
      case "agent.tool_start":
        if (belongsToCurrent) this.startTool(payload);
        break;
      case "agent.tool_end":
        if (belongsToCurrent) this.endTool(payload);
        break;
      case "agent.plan":
        if (belongsToCurrent) this.updatePlan(payload);
        break;
      case "terminal.output":
        this.terminal.append(
          stringValue(payload.id),
          terminalStream(stringValue(payload.stream)),
          stringValue(payload.text),
        );
        break;
      case "terminal.exit":
        this.terminal.exited(
          stringValue(payload.id),
          typeof payload.exitCode === "number" ? payload.exitCode : -1,
        );
        break;
      case "workspace.changed":
        void this.workspace.refreshTree();
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

  private startTool(payload: JsonObject): void {
    const call = objectValue(payload.call ?? null);
    const activity: ToolActivity = {
      id: stringValue(call.id),
      name: stringValue(call.name),
      status: "running",
      detail: JSON.stringify(call.arguments ?? {}),
    };
    this.runtime.state.tools.update((items) => [...items, activity]);
    this.openTasks();
  }

  private endTool(payload: JsonObject): void {
    const id = stringValue(payload.callId);
    this.runtime.state.tools.update((items) =>
      items.map((item) => item.id === id ? { ...item, status: "complete" } : item),
    );
  }

  private updatePlan(payload: JsonObject): void {
    const state = this.runtime.state;
    const plan = Array.isArray(payload.plan) ? payload.plan as unknown as PlanStep[] : [];
    state.planDescription.set(stringValue(payload.explanation));
    state.planSteps.set(plan.filter((step) =>
      step?.step && ["pending", "in_progress", "completed"].includes(step.status)
    ));
    state.planUpdatedAt.set(new Date().toISOString());
    this.openTasks();
  }

  private openTasks(): void {
    const state = this.runtime.state;
    if (!state.autoOpenTasks.get()) return;
    openPanel(state, "tasks");
  }
}

function terminalStream(
  value: string,
): "command" | "stdout" | "stderr" | "prompt" | "status" {
  return value === "command" || value === "stderr" || value === "prompt" || value === "status"
    ? value
    : "stdout";
}

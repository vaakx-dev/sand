import {
  objectValue,
  stringValue,
  type JsonObject,
  type JsonValue,
  type RuntimeEvent,
  type UiEvent,
  type UiSurfaceRegistry,
} from "@sand/extension-api";

import type { PlanStep, ToolActivity } from "./models.ts";
import type { PlanState } from "./state.ts";

export class PlanController {
  constructor(
    private readonly surfaces: UiSurfaceRegistry,
    readonly state: PlanState,
  ) {}

  onUiEvent(event: UiEvent): void {
    if (event.kind !== "workbench.session.changed") return;
    const payload = objectValue(event.payload as JsonObject);
    this.state.currentSession.set(typeof payload.sessionId === "string" ? payload.sessionId : null);
  }

  onRuntimeEvent(event: RuntimeEvent): void {
    const payload = objectValue(event.payload);
    const sessionId = stringValue(payload.sessionId);
    if (!sessionId) return;

    if (event.kind === "agent.plan") this.updatePlan(sessionId, payload);
    if (event.kind === "agent.tool_start") this.startTool(sessionId, payload);
    if (event.kind === "agent.tool_end") this.completeTool(sessionId, payload);

    const visibleSession = this.state.currentSession.get();
    if ((event.kind === "agent.plan" || event.kind === "agent.tool_start")
      && (!visibleSession || visibleSession === sessionId)) {
      void this.surfaces.open("plan");
    }
  }

  private updatePlan(sessionId: string, payload: JsonObject): void {
    this.state.plans.update((plans) => ({
      ...plans,
      [sessionId]: {
        description: stringValue(payload.explanation),
        steps: planSteps(payload.plan),
        updatedAt: new Date().toISOString(),
      },
    }));
  }

  private startTool(sessionId: string, payload: JsonObject): void {
    const call = objectValue(payload.call ?? null);
    const id = stringValue(call.id);
    if (!id) return;
    const activity: ToolActivity = {
      id,
      name: stringValue(call.name),
      detail: JSON.stringify(call.arguments ?? {}),
      status: "running",
    };
    this.state.activities.update((activities) => ({
      ...activities,
      [sessionId]: [...(activities[sessionId] ?? []), activity],
    }));
  }

  private completeTool(sessionId: string, payload: JsonObject): void {
    const callId = stringValue(payload.callId);
    this.state.activities.update((activities) => ({
      ...activities,
      [sessionId]: (activities[sessionId] ?? []).map((activity) =>
        activity.id === callId ? { ...activity, status: "complete" } : activity
      ),
    }));
  }
}

function planSteps(value: JsonValue | undefined): PlanStep[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const step = entry.step;
    const status = entry.status;
    return typeof step === "string"
      && (status === "pending" || status === "in_progress" || status === "completed")
      ? [{ step, status }]
      : [];
  });
}

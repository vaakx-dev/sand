import {
  objectValue,
  stringValue,
  type JsonObject,
  type JsonValue,
  type OrchestrationEvent,
  type RuntimeClient,
  type RuntimeEvent,
  type UiEvent,
  type UiSurfaceRegistry,
} from "@sand/extension-api";

import type { PlanStep, ToolActivity } from "./models.ts";
import type { PlanState } from "./state.ts";

export class PlanController {
  constructor(
    private readonly runtime: RuntimeClient,
    private readonly surfaces: UiSurfaceRegistry,
    readonly state: PlanState,
  ) {}

  onUiEvent(event: UiEvent): void {
    if (event.kind !== "workbench.thread.changed") return;
    const payload = objectValue(event.payload as JsonObject);
    const threadId = typeof payload.threadId === "string" ? payload.threadId : null;
    this.state.currentThread.set(threadId);
    if (threadId) {
      void this.restore(threadId).catch((error) => console.error("cannot restore plan", error));
    }
  }

  private async restore(threadId: string): Promise<void> {
    const events = await this.runtime.call<OrchestrationEvent[]>("orchestration.events", { threadId });
    this.state.plans.update((plans) => omit(plans, threadId));
    this.state.activities.update((activities) => omit(activities, threadId));

    for (const event of events) {
      const payload = objectValue(event.payload);
      if (event.kind === "plan.updated") this.updatePlan(threadId, payload);
      if (event.kind === "tool.started") this.startTool(threadId, payload);
      if (event.kind === "tool.completed") this.completeTool(threadId, payload);
    }
  }

  onRuntimeEvent(event: RuntimeEvent): void {
    const payload = objectValue(event.payload);
    const threadId = stringValue(payload.threadId);
    if (!threadId) return;

    if (event.kind === "orchestration.plan") this.updatePlan(threadId, payload);
    if (event.kind === "orchestration.tool_start") this.startTool(threadId, payload);
    if (event.kind === "orchestration.tool_end") this.completeTool(threadId, payload);

    const visibleThread = this.state.currentThread.get();
    if ((event.kind === "orchestration.plan" || event.kind === "orchestration.tool_start")
      && (!visibleThread || visibleThread === threadId)) {
      void this.surfaces.open("plan");
    }
  }

  private updatePlan(threadId: string, payload: JsonObject): void {
    this.state.plans.update((plans) => ({
      ...plans,
      [threadId]: {
        description: stringValue(payload.explanation),
        steps: planSteps(payload.plan),
        updatedAt: new Date().toISOString(),
      },
    }));
  }

  private startTool(threadId: string, payload: JsonObject): void {
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
      [threadId]: [...(activities[threadId] ?? []), activity],
    }));
  }

  private completeTool(threadId: string, payload: JsonObject): void {
    const callId = stringValue(payload.callId);
    this.state.activities.update((activities) => ({
      ...activities,
      [threadId]: (activities[threadId] ?? []).map((activity) =>
        activity.id === callId ? { ...activity, status: "complete" } : activity
      ),
    }));
  }
}

function omit<T>(values: Record<string, T>, key: string): Record<string, T> {
  const next = { ...values };
  delete next[key];
  return next;
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

import { sig } from "@vaakx-dev/vrui";

import type { ExecutionPlan, ToolActivity } from "./models.ts";

export function createPlanState() {
  return {
    currentThread: sig<string | null>(null),
    plans: sig<Record<string, ExecutionPlan>>({}),
    activities: sig<Record<string, ToolActivity[]>>({}),
  };
}

export type PlanState = ReturnType<typeof createPlanState>;

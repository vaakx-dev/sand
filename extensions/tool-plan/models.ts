export interface PlanStep {
  step: string;
  status: "pending" | "in_progress" | "completed";
}

export interface ExecutionPlan {
  description: string;
  steps: PlanStep[];
  updatedAt: string;
}

export interface ToolActivity {
  id: string;
  name: string;
  detail: string;
  status: "running" | "complete";
}

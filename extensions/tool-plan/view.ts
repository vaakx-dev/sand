import { derive, div, dynamicChild, icon, list, show, span } from "@vaakx-dev/vrui";
import { CheckCircle2, Circle, ListTodo } from "lucide";

import type { PlanState } from "./state.ts";

export function planView(state: PlanState): HTMLElement {
  const plan = derive(() => {
    const id = state.currentThread.get();
    return id ? state.plans.get()[id] : undefined;
  });
  const tools = derive(() => {
    const id = state.currentThread.get();
    return id ? state.activities.get()[id] ?? [] : [];
  });

  return div(
    { class: "plan-view" },
    div(
      { class: "plan-summary" },
      span({ class: "plan-label" }, "Tasks"),
      span({ class: "plan-time" }, plan.map((value) => value ? relativeTime(value.updatedAt) : "")),
    ),
    div(
      { class: "plan-description" },
      plan.map((value) => value?.description || "Agent activity and extension tool calls for the current thread."),
    ),
    show(plan.map((value) => Boolean(value?.steps.length)), () => div(
      { class: "plan-section" },
      span({ class: "plan-section-label" }, "Steps"),
      list(
        plan.map((value) => value?.steps ?? []),
        (step) => step.step,
        (step) => div(
          { class: ["plan-step", step.prop("status")] },
          dynamicChild(step.prop("status"), (status) =>
            icon(status === "completed" ? CheckCircle2 : Circle, status === "pending" ? 13 : 14)
          ),
          span(step.prop("step")),
        ),
        div({ class: "plan-steps" }),
      ),
    )),
    show(tools.map((values) => values.length > 0), () => span(
      { class: "plan-section-label activity-label" },
      "Activity",
    )),
    list(
      tools,
      (tool) => tool.id,
      (tool) => div(
        { class: ["task-row", tool.prop("status")] },
        dynamicChild(tool.prop("status"), (status) => icon(status === "complete" ? CheckCircle2 : Circle, 14)),
        div(
          { class: "task-copy" },
          span({ class: "task-name" }, tool.prop("name")),
          span({ class: "task-detail" }, tool.prop("detail")),
        ),
      ),
      div({ class: "task-list" }),
    ),
    show(tools.map((values) => values.length === 0), () => div(
      { class: "plan-empty" },
      icon(ListTodo, 18),
      "No tool calls yet",
    )),
  );
}

function relativeTime(value: string): string {
  const elapsed = Date.now() - Date.parse(value);
  if (!Number.isFinite(elapsed) || elapsed < 60_000) return "now";
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h`;
  return `${Math.floor(elapsed / 86_400_000)}d`;
}

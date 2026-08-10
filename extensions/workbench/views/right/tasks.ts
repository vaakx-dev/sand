import { div, dynamicChild, icon, list, show, span } from "@vaakx-dev/vrui";
import { CheckCircle2, Circle, ListTodo } from "lucide";

import type { WorkbenchState } from "../../state.ts";
import { relativeTime } from "../format.ts";

export function tasksView(state: WorkbenchState): HTMLElement {
  return div(
    { class: "tasks-view" },
    div(
      { class: "tasks-summary" },
      span({ class: "tasks-label" }, "Tasks"),
      span({ class: "tasks-time" }, state.planUpdatedAt.map((value) => value ? relativeTime(value) : state.agentStatus.get())),
    ),
    div(
      { class: "tasks-description" },
      state.sessionId.map((id) => id
        ? state.planDescription.get() || "Agent activity and extension tool calls for the current thread."
        : "Start a thread to create an execution plan."),
    ),
    show(state.planSteps.map((steps) => steps.length > 0), () => div(
      { class: "plan-section" },
      span({ class: "plan-section-label" }, "Steps"),
      list(
        state.planSteps,
        (step) => step.step,
        (step) => div(
          { class: ["plan-step", {
            pending: step.map((value) => value.status === "pending"),
            inProgress: step.map((value) => value.status === "in_progress"),
            completed: step.map((value) => value.status === "completed"),
          }] },
          dynamicChild(step.prop("status"), (status) => status === "completed"
            ? icon(CheckCircle2, 14)
            : icon(Circle, status === "in_progress" ? 14 : 13)),
          span(step.prop("step")),
        ),
        div({ class: "plan-steps" }),
      ),
    )),
    show(state.tools.map((tools) => tools.length > 0), () => span({ class: "plan-section-label task-activity-label" }, "Activity")),
    list(
      state.tools,
      (tool) => tool.id,
      (tool) => div(
        { class: ["task-row", {
          running: tool.map((value) => value.status === "running"),
          complete: tool.map((value) => value.status === "complete"),
        }] },
        dynamicChild(tool.prop("status"), (status) => status === "complete"
          ? icon(CheckCircle2, 14)
          : icon(Circle, 14)),
        div(
          { class: "task-copy" },
          span({ class: "task-name" }, tool.prop("name")),
          span({ class: "task-detail" }, tool.prop("detail")),
        ),
      ),
      div({ class: "tasks-list" }),
    ),
    dynamicChild(state.tools, (tools) => tools.length
      ? div()
      : div({ class: "tasks-empty" }, icon(ListTodo, 18), "No tool calls yet")),
  );
}

import { button, div, icon, span, stop } from "@vaakx-dev/vrui";
import { Zap } from "lucide";

import type { WorkbenchController } from "../../controller.ts";
import type { ReasoningEffort } from "../../models.ts";
import type { WorkbenchState } from "../../state.ts";
import { reasoningLabel } from "./labels.ts";
import { closeOnOutside } from "./popover.ts";

const EFFORTS: ReasoningEffort[] = ["low", "medium", "high", "xhigh", "max", "ultra"];

export function traitsPicker(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  return div(
    {
      class: "composer-popover-layer",
      onMount: (element) => closeOnOutside(element, () => state.traitsOpen.set(false)),
    },
    div(
      { class: "traits-picker composer-popover", onClick: stop },
      span({ class: "traits-heading" }, "Reasoning"),
      ...EFFORTS.map((effort) => button(
        {
          class: ["traits-row", { active: state.reasoning.map((value) => value === effort) }],
          onClick: () => {
            state.reasoning.set(effort);
            void controller.agent.saveOptions();
          },
        },
        span(reasoningLabel(effort)),
        effort === "low" ? span({ class: "default-badge" }, "Default") : null,
      )),
      div({ class: "traits-divider" }),
      span({ class: "traits-heading" }, "Service tier"),
      button(
        {
          class: ["traits-row", {
            active: state.serviceTier.map((value) => value === "standard"),
          }],
          onClick: () => {
            state.serviceTier.set("standard");
            void controller.agent.saveOptions();
          },
        },
        span("Standard"),
        span({ class: "default-badge" }, "Default"),
      ),
      button(
        {
          class: ["traits-row", {
            active: state.serviceTier.map((value) => value === "fast"),
          }],
          onClick: () => {
            state.serviceTier.set("fast");
            void controller.agent.saveOptions();
          },
        },
        icon(Zap, 13),
        span("Fast"),
      ),
    ),
  );
}

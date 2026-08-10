import { button, derive, div, dynamicChild, span, stop, type Sig } from "@vaakx-dev/vrui";

import type { AgentProviderOption } from "@sand/extension-api";

import type { WorkbenchController } from "../../controller.ts";
import { findModel } from "../../modelCatalog.ts";
import type { WorkbenchState } from "../../state.ts";
import { closeOnOutside } from "./popover.ts";

export function traitsPicker(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  const model = derive(() => findModel(
    state.providerModels.get(),
    state.provider.get(),
    state.model.get(),
  ));

  return div(
    {
      class: "composer-popover-layer",
      onMount: (element) => closeOnOutside(element, () => state.traitsOpen.set(false)),
    },
    div(
      { class: "traits-picker composer-popover", onClick: stop },
      dynamicChild(model, (selected) => selected
        ? div(
            { class: "traits-options" },
            ...optionSection(
              "Reasoning",
              selected.reasoning,
              selected.defaultReasoning,
              state.reasoning,
              (value) => state.reasoning.set(value),
              controller,
            ),
            selected.reasoning.length > 0 && selected.serviceTiers.length > 0
              ? div({ class: "traits-divider" })
              : null,
            ...optionSection(
              "Service tier",
              selected.serviceTiers,
              selected.defaultServiceTier,
              state.serviceTier,
              (value) => state.serviceTier.set(value),
              controller,
            ),
          )
        : div({ class: "traits-empty" }, "No model options")),
    ),
  );
}

function optionSection(
  heading: string,
  options: AgentProviderOption[],
  defaultValue: string,
  selected: Sig<string>,
  set: (value: string) => void,
  controller: WorkbenchController,
): HTMLElement[] {
  if (options.length === 0) return [];
  return [
    span({ class: "traits-heading" }, heading),
    ...options.map((option) => button(
      {
        class: ["traits-row", { active: selected.map((value) => value === option.id) }],
        onClick: () => {
          set(option.id);
          void controller.agent.saveOptions();
        },
      },
      span(option.label),
      option.id === defaultValue ? span({ class: "default-badge" }, "Default") : null,
    )),
  ];
}

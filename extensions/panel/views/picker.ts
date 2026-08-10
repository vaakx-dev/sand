import { button, div, dynamicChild, span } from "@vaakx-dev/vrui";

import type { PanelController } from "../controller.ts";
import type { PanelState } from "../state.ts";
import { available, surfaceIcon } from "./surface.ts";

export function surfacePicker(controller: PanelController, state: PanelState): HTMLElement {
  return div(
    { class: "panel-picker" },
    div({ class: "panel-picker-title" }, "Open a surface"),
    div({ class: "panel-picker-description" }, "Choose what to show in the panel."),
    dynamicChild(state.surfaces, (items) => div(
      { class: "panel-grid" },
      ...items.map((surface) => button(
        {
          class: "panel-card",
          disabled: !available(surface),
          onClick: () => void controller.open(surface),
        },
        surfaceIcon(surface, 18),
        span({ class: "panel-card-label" }, surface.label),
        span({ class: "panel-card-description" }, surface.description),
      )),
    )),
  );
}

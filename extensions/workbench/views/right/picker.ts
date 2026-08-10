import { button, div, icon, span, type MaybeReactive } from "@vaakx-dev/vrui";

import type { WorkbenchController } from "../../controller.ts";
import type { WorkbenchState } from "../../state.ts";
import { openSurface, SURFACES } from "./surfaces.ts";

export function surfacePicker(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  return div(
    { class: "surface-picker" },
    div({ class: "surface-picker-title" }, "Open a surface"),
    div({ class: "surface-picker-description" }, "Choose what to show in the right panel."),
    div(
      { class: "surface-grid" },
      ...SURFACES.map((surface) => surfaceCard(
        surface.icon,
        surface.label,
        surface.description,
        () => openSurface(controller, state, surface.id),
        surface.id === "changes"
          ? state.gitRepository.map((repository) => !repository)
          : false,
      )),
    ),
  );
}

function surfaceCard(
  surfaceIcon: Parameters<typeof icon>[0],
  label: string,
  description: string,
  action: () => void,
  disabled: MaybeReactive<boolean> = false,
): HTMLElement {
  return button(
    { class: "surface-card", disabled, onClick: action },
    icon(surfaceIcon, 18),
    span({ class: "surface-card-label" }, label),
    span({ class: "surface-card-description" }, description),
  );
}

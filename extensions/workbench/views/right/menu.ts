import { button, div, icon, onWindow, type MaybeReactive } from "@vaakx-dev/vrui";

import type { WorkbenchController } from "../../controller.ts";
import type { WorkbenchState } from "../../state.ts";
import { openSurface, SURFACES } from "./surfaces.ts";

export function rightAddMenu(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  return div(
    {
      class: "right-add-menu",
      role: "menu",
      onMount: (element) => onWindow(element, "pointerdown", (event) => {
        if (!element.parentElement?.contains(event.target as Node)) state.rightAddOpen.set(false);
      }),
    },
    ...SURFACES.map((surface) => menuItem(
      surface.icon,
      surface.label,
      () => openSurface(controller, state, surface.id),
      surface.id === "changes"
        ? state.gitRepository.map((repository) => !repository)
        : false,
    )),
  );
}

function menuItem(
  node: Parameters<typeof icon>[0],
  label: string,
  onClick: () => void,
  disabled: MaybeReactive<boolean> = false,
): HTMLElement {
  return button(
    { class: "right-add-row", role: "menuitem", disabled, onClick },
    icon(node, 14),
    label,
  );
}

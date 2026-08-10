import { button, div, dynamicChild, icon, onWindow, show } from "@vaakx-dev/vrui";
import { Maximize2, Minimize2, PanelRight, Plus } from "lucide";

import type { UiControls } from "@sand/extension-api";

import type { PanelController } from "../controller.ts";
import type { PanelState } from "../state.ts";
import { available, surfaceIcon } from "./surface.ts";

export function addAction(
  controller: PanelController,
  state: PanelState,
  controls: UiControls,
): HTMLElement {
  return div(
    {
      class: "panel-add",
      hidden: state.open.map((open) => !open),
    },
    controls.iconButton({
      label: "Open surface",
      selected: state.addOpen,
      renderIcon: (size) => icon(Plus, size),
      onClick: () => controller.toggleAdd(),
    }),
    show(state.addOpen, () => surfaceMenu(controller, state)),
  );
}

export function maximizeAction(
  controller: PanelController,
  state: PanelState,
  controls: UiControls,
): HTMLElement {
  return show(state.open, () => controls.iconButton({
    label: state.maximized.map((maximized) => maximized ? "Restore panel" : "Maximize panel"),
    selected: state.maximized,
    renderIcon: (size) => dynamicChild(
      state.maximized,
      (maximized) => icon(maximized ? Minimize2 : Maximize2, size),
    ),
    onClick: () => controller.toggleMaximized(),
  }));
}

export function toggleAction(
  controller: PanelController,
  state: PanelState,
  controls: UiControls,
): HTMLElement {
  return controls.iconButton({
    label: "Toggle panel",
    selected: state.open,
    renderIcon: (size) => icon(PanelRight, size),
    onClick: () => controller.toggle(),
  });
}

function surfaceMenu(controller: PanelController, state: PanelState): HTMLElement {
  return div(
    {
      class: "panel-menu",
      role: "menu",
      onMount: (element) => onWindow(element, "pointerdown", (event) => {
        if (!element.parentElement?.contains(event.target as Node)) controller.closeAdd();
      }),
    },
    ...state.surfaces.get().map((surface) => button(
      {
        class: "panel-menu-item",
        role: "menuitem",
        disabled: !available(surface),
        onClick: () => void controller.open(surface),
      },
      surfaceIcon(surface, 14),
      surface.label,
    )),
  );
}

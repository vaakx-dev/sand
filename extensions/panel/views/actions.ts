import { dynamicChild, icon, span } from "@vaakx-dev/vrui";
import { Maximize2, Minimize2, PanelRight, Plus } from "lucide";

import type { SandUi } from "sand:api/ui";
import type { PanelController } from "../controller.ts";
import type { PanelState } from "../state.ts";
import { available } from "./surface.ts";

export function addAction(
  controller: PanelController,
  state: PanelState,
  ui: SandUi,
): HTMLElement {
  return ui.menuButton({
    label: "Open surface",
    trigger: "icon",
    open: state.addOpen,
    hidden: state.open.map((open) => !open),
    renderIcon: (size) => icon(Plus, size),
    items: () => state.surfaces.get().map((surface) => ({
      label: surface.label,
      disabled: !available(surface),
      renderIcon: (size: number) => surface.renderIcon(size),
      run: () => controller.open(surface),
    })),
    onOpenChange: () => controller.syncVisibility(),
  });
}

export function maximizeAction(
  controller: PanelController,
  state: PanelState,
  ui: SandUi,
): HTMLElement {
  return dynamicChild(state.open, (open) => open
    ? ui.iconButton({
        label: state.maximized.map((maximized) => maximized ? "Restore panel" : "Maximize panel"),
        selected: state.maximized,
        renderIcon: (size) => dynamicChild(
          state.maximized,
          (maximized) => icon(maximized ? Minimize2 : Maximize2, size),
        ),
        onClick: () => controller.toggleMaximized(),
      })
    : span({ hidden: true }));
}

export function toggleAction(
  controller: PanelController,
  state: PanelState,
  ui: SandUi,
): HTMLElement {
  return ui.iconButton({
    label: "Toggle panel",
    selected: state.open,
    renderIcon: (size) => icon(PanelRight, size),
    onClick: () => controller.toggle(),
  });
}

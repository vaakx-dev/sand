import { dynamicChild } from "@vaakx-dev/vrui";

import type { ChoiceItem, SandUi } from "sand:api/ui";
import type { PanelController } from "../controller.ts";
import type { PanelState } from "../state.ts";
import type { UiSurfaceContribution } from "sand:api/workbench";
import { available } from "./surface.ts";

interface SurfaceChoice extends ChoiceItem {
  surface: UiSurfaceContribution;
}

export function surfacePicker(
  controller: PanelController,
  state: PanelState,
  ui: SandUi,
): HTMLElement {
  return dynamicChild(state.activeTab, (tab) => tab
    ? document.createElement("span")
    : ui.emptyState({
        title: "Open a surface",
        description: "Choose what to show in the panel.",
        content: ui.choiceGrid<SurfaceChoice>({
          items: () => state.surfaces.get().map((surface) => ({
            id: surface.id,
            label: surface.label,
            description: surface.description,
            disabled: !available(surface),
            renderIcon: surface.renderIcon,
            surface,
          })),
          onSelect: (choice) => void controller.open(choice.surface),
        }),
      }));
}

import { div, dynamicChild, icon, show } from "@vaakx-dev/vrui";
import {
  Maximize2,
  Minimize2,
  PanelBottom,
  PanelRightClose,
  Plus,
} from "lucide";

import type { WorkbenchController } from "../../controller.ts";
import { hidePanel, restorePanel, togglePanelMaximized } from "../../panel.ts";
import type { WorkbenchState } from "../../state.ts";
import { iconButton } from "../shared/iconButton.ts";
import { rightAddMenu } from "./menu.ts";

export function rightPanelActions(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  const maximizeLabel = state.rightMaximized.map((maximized) => maximized
    ? "Restore panel"
    : "Maximize panel");

  return div(
    { class: "right-panel-actions" },
    div(
      { class: "right-add-wrap" },
      iconButton(
        {
          label: "Open surface",
          selected: state.rightAddOpen,
          expanded: state.rightAddOpen,
          onClick: state.rightAddOpen.toggle(),
        },
        icon(Plus, 14),
      ),
      show(state.rightAddOpen, () => rightAddMenu(controller, state)),
    ),
    iconButton(
      {
        label: maximizeLabel,
        selected: state.rightMaximized,
        onClick: () => {
          togglePanelMaximized(state);
          void controller.preferences.saveLayout();
        },
      },
      dynamicChild(
        state.rightMaximized,
        (maximized) => icon(maximized ? Minimize2 : Maximize2, 14),
      ),
    ),
    iconButton(
      {
        label: "Toggle terminal drawer (Ctrl+J)",
        selected: state.bottomOpen,
        onClick: () => {
          restorePanel(state);
          void controller.terminal.toggle();
          void controller.preferences.saveLayout();
        },
      },
      icon(PanelBottom, 14),
    ),
    iconButton(
      {
        label: "Hide right panel",
        selected: true,
        onClick: () => {
          hidePanel(state);
          void controller.preferences.saveLayout();
        },
      },
      icon(PanelRightClose, 14),
    ),
  );
}

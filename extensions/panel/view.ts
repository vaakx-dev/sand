import type { SandUi } from "sand:api/ui";
import type { PanelController } from "./controller.ts";
import {
  normalizeWidth,
  PANEL_MAX_WIDTH,
  PANEL_MIN_WIDTH,
  type PanelState,
} from "./state.ts";
import { header } from "./views/header.ts";
import { surfacePicker } from "./views/picker.ts";

export function panelView(
  controller: PanelController,
  state: PanelState,
  ui: SandUi,
): HTMLElement {
  return ui.pane(
    {
      visible: state.open,
      maximized: state.maximized,
      width: state.width,
      minimumWidth: PANEL_MIN_WIDTH,
      maximumWidth: PANEL_MAX_WIDTH,
      onResize: (width) => state.width.set(normalizeWidth(width)),
      onResizeEnd: () => controller.saveWidth(),
      header: header(controller, state, ui),
    },
    ui.viewStack({ items: state.tabs, active: state.activeId }),
    surfacePicker(controller, state, ui),
  );
}

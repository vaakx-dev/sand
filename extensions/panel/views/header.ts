import { div, dynamicChild } from "@vaakx-dev/vrui";

import type { SandUi } from "sand:api/ui";
import type { PanelController } from "../controller.ts";
import type { PanelState } from "../state.ts";

export function header(
  controller: PanelController,
  state: PanelState,
  ui: SandUi,
): HTMLElement {
  return ui.tabs({
    items: state.tabs,
    active: state.activeId,
    getId: (tab) => tab.id,
    getLabel: (tab) => tab.surface.label,
    renderIcon: (tab, size) => tab.surface.renderIcon(size),
    onSelect: (tab) => controller.selectTab(tab.id),
    onClose: (tab) => controller.closeTab(tab.id),
    actions: dynamicChild(state.activeTab, (tab) => div(
      {},
      tab?.surface.renderActions?.(tab.instance) ?? "",
    )),
  });
}

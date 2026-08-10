import { div, dynamicChild, icon, list, span, stopThen } from "@vaakx-dev/vrui";
import { X } from "lucide";

import type { UiControls } from "@sand/extension-api";

import type { PanelController } from "../controller.ts";
import type { PanelTab } from "../models.ts";
import type { PanelState } from "../state.ts";
import { surfaceIcon } from "./surface.ts";

export function header(
  controller: PanelController,
  state: PanelState,
  controls: UiControls,
): HTMLElement {
  return div(
    { class: "panel-header", "data-tauri-drag-region": "" },
    list(
      state.tabs,
      (tab) => tab.id,
      (tab) => panelTab(controller, state, controls, tab.get()),
      div({ class: "panel-tabs", role: "tablist" }),
    ),
    surfaceActions(state),
  );
}

function panelTab(
  controller: PanelController,
  state: PanelState,
  controls: UiControls,
  tab: PanelTab,
): HTMLElement {
  return div(
    {
      class: ["panel-tab", { active: state.activeId.map((id) => id === tab.id) }],
      role: "tab",
      tabIndex: 0,
      "aria-selected": state.activeId.map((id) => id === tab.id),
      onClick: () => controller.selectTab(tab.id),
      onKeyDown: (event) => {
        if (event.key === "Enter" || event.key === " ") controller.selectTab(tab.id);
      },
    },
    surfaceIcon(tab.surface, 14),
    span({ class: "panel-tab-label" }, tab.surface.label),
    controls.iconButton({
      label: `Close ${tab.surface.label}`,
      variant: "tiny",
      className: "panel-tab-close",
      renderIcon: (size) => icon(X, size),
      onClick: stopThen(() => controller.closeTab(tab.id)),
    }),
  );
}

function surfaceActions(state: PanelState): HTMLElement {
  return dynamicChild(state.activeTab, (tab) => div(
    { class: "panel-context-actions" },
    tab?.surface.renderActions?.(tab.instance) ?? "",
  ));
}

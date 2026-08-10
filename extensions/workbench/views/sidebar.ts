import { button, div, dynamicChild, icon, span } from "@vaakx-dev/vrui";
import { ArrowLeft, PanelLeftClose, Settings } from "lucide";

import type { WorkbenchController } from "../controller.ts";
import type { WorkbenchState } from "../state.ts";
import { explorerView, extensionsView, searchView } from "./sidebar/panels.ts";
import { settingsNavigation } from "./sidebar/settings.ts";
import { footerButton } from "./sidebar/shared.ts";
import { threadsView } from "./sidebar/threads.ts";

export function sidebar(controller: WorkbenchController, state: WorkbenchState): HTMLElement {
  return dynamicChild(state.sidebarOpen, (open) => open
    ? expandedSidebar(controller, state)
    : div({ class: "sidebar offcanvas", "aria-hidden": "true" })
  );
}

function expandedSidebar(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  return div(
    { class: "sidebar expanded" },
    sidebarChrome(controller, state),
    dynamicChild(state.activity, (activity) => {
      switch (activity) {
        case "threads": return threadsView(controller, state);
        case "search": return searchView(controller, state);
        case "extensions": return extensionsView(controller, state);
        case "settings": return settingsNavigation(state);
        default: return explorerView(controller, state);
      }
    }),
    dynamicChild(state.activity, (activity) => div(
      { class: "sidebar-footer" },
      activity === "settings"
        ? button(
            { class: "sidebar-footer-button", onClick: state.activity.setter("threads") },
            icon(ArrowLeft, 14),
            "Back",
          )
        : footerButton(state, "settings", Settings, "Settings"),
    )),
  );
}

function sidebarChrome(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  return div(
    { class: "sidebar-chrome", "data-tauri-drag-region": "" },
    button(
      {
        class: "sidebar-menu-icon",
        "aria-label": "Close sidebar",
        "data-tooltip": "Close sidebar (Ctrl+B)",
        onClick: () => {
          state.sidebarOpen.set(false);
          void controller.preferences.saveLayout();
        },
      },
      icon(PanelLeftClose, 15),
    ),
    span({ class: "sidebar-wordmark", "data-tauri-drag-region": "" }, "Sand"),
  );
}

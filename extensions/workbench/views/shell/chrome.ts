import { div, icon, span } from "@vaakx-dev/vrui";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { FolderOpen, Minus, PanelLeft, Square, X } from "lucide";

import type { UiControls, UiSlotRegistry } from "@sand/extension-api";

import { workbenchSlots } from "../../api.ts";
import type { WorkbenchController } from "../../controller.ts";
import type { WorkbenchState } from "../../state.ts";
import { projectName } from "../format.ts";
import { uiSlot } from "../shared/slot.ts";

export function windowControls(controls: UiControls): HTMLElement {
  const window = getCurrentWindow();
  return div(
    { class: "window-controls" },
    controls.iconButton({
      label: "Minimize",
      variant: "window",
      className: "window-control",
      tooltip: false,
      renderIcon: (size) => icon(Minus, size),
      onClick: () => void window.minimize(),
    }),
    controls.iconButton({
      label: "Maximize",
      variant: "window",
      className: "window-control",
      tooltip: false,
      renderIcon: (size) => icon(Square, size),
      onClick: () => void window.toggleMaximize(),
    }),
    controls.iconButton({
      label: "Close",
      variant: "window",
      className: ["window-control", "close"],
      tooltip: false,
      renderIcon: (size) => icon(X, size),
      onClick: () => void window.close(),
    }),
  );
}

export function header(
  controller: WorkbenchController,
  state: WorkbenchState,
  slots: UiSlotRegistry,
  controls: UiControls,
): HTMLElement {
  return div(
    {
      class: ["app-header", { "sidebar-expanded": state.sidebarOpen }],
      "data-tauri-drag-region": "",
    },
    sidebarBrand(controller, state, controls),
    div({ class: "header-grip", "data-tauri-drag-region": "" }),
    div(
      { class: "topbar", "data-tauri-drag-region": "" },
      div(
        {
          class: "topbar-breadcrumb",
          hidden: state.activity.map((activity) => activity === "settings"),
          "data-tauri-drag-region": "",
        },
        icon(FolderOpen, 13),
        span({ class: "breadcrumb-project" }, state.root.map(projectName)),
        span({ class: "breadcrumb-slash" }, "/"),
        span({ class: "topbar-title" }, state.threads.current.map((id) => {
          if (!id) return "New thread";
          return state.threads.items.get().find((thread) => thread.id === id)?.title || "Thread";
        })),
      ),
      span(
        {
          class: "topbar-section",
          hidden: state.activity.map((activity) => activity !== "settings"),
          "data-tauri-drag-region": "",
        },
        "Settings",
      ),
      div(
        {
          class: "top-actions",
          hidden: state.activity.map((activity) => activity === "settings"),
        },
        uiSlot(slots, workbenchSlots.topbarActions, "topbar-extension-actions"),
      ),
    ),
  );
}

function sidebarBrand(
  controller: WorkbenchController,
  state: WorkbenchState,
  controls: UiControls,
): HTMLElement {
  return div(
    { class: "sidebar-brand", "data-tauri-drag-region": "" },
    controls.iconButton({
      label: "Toggle sidebar",
      tooltip: "Toggle sidebar (Ctrl+B)",
      selected: state.sidebarOpen,
      className: "sidebar-toggle",
      renderIcon: (size) => icon(PanelLeft, size),
      onClick: () => controller.toggleSidebar(),
    }),
    span({ class: "sidebar-wordmark", "data-tauri-drag-region": "" }, "Sand"),
  );
}

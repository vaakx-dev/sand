import { derive, div, keep, onTimeout, onWindow, portal, show } from "@vaakx-dev/vrui";

import type { UiRegistry } from "@sand/extension-api";

import { workbenchSlots } from "../api.ts";
import type { WorkbenchController } from "../controller.ts";
import type { WorkbenchState } from "../state.ts";
import { agentView } from "./agent.ts";
import { settingsWorkspace } from "./settings.ts";
import { sidebar } from "./sidebar.ts";
import { header, windowControls } from "./shell/chrome.ts";
import { paneResizer, SIDEBAR_MAX, SIDEBAR_MIN } from "./shell/resizer.ts";
import { globalKeyDown } from "./shell/shortcuts.ts";
import { renameDialog } from "./sidebar/threads/dialog.ts";
import { contextMenu } from "./sidebar/threads/menu.ts";
import { hoverCard } from "./sidebar/threads/preview.ts";
import { mountMeasuredUiSlot, uiSlot } from "./shared/slot.ts";

export function shell(
  controller: WorkbenchController,
  state: WorkbenchState,
  ui: UiRegistry,
): HTMLElement {
  const sidebarWidth = state.sidebarWidth.map((width) => `${width}px`);
  const sidebarColumn = derive(() => state.sidebarOpen.get() ? sidebarWidth.get() : "0px");
  const sidebarGrip = state.sidebarOpen.map((open) => open ? "3px" : "0px");
  const sidebarSpace = derive(() => state.sidebarOpen.get()
    ? `${state.sidebarWidth.get() + 3}px`
    : "0px");
  const brandWidth = derive(() => state.sidebarOpen.get() ? sidebarWidth.get() : "84px");

  return div(
    {
      class: "workbench",
      "data-theme": state.theme,
      "data-appearance": state.appearance,
      style: {
        "--workbench-brand-width": brandWidth,
        "--workbench-sidebar-column": sidebarColumn,
        "--workbench-sidebar-grip": sidebarGrip,
        "--workbench-sidebar-space": sidebarSpace,
      },
      onMount: (element) => onWindow(
        element,
        "keydown",
        (event) => globalKeyDown(event as KeyboardEvent, controller, state),
      ),
    },
    header(controller, state, ui.slots, ui.controls),
    div({ class: "sidebar-slot" }, sidebar(controller, state, ui.slots, ui.controls)),
    div(
      { class: "resizer-slot" },
      keep(state.sidebarOpen, () => paneResizer(
        "left",
        state.sidebarWidth,
        SIDEBAR_MIN,
        SIDEBAR_MAX,
        controller,
      )),
    ),
    div(
      { class: "center-slot" },
      div(
        {
          class: "center-shell",
          hidden: state.activity.map((activity) => activity === "settings"),
        },
        div({ class: "main-column" }, agentView(controller, state, ui.tools, ui.controls)),
        uiSlot(ui.slots, workbenchSlots.bottom, "bottom-slot"),
      ),
      settingsWorkspace(controller, state, ui.controls),
    ),
    uiSlot(ui.slots, workbenchSlots.auxiliary, "extension-slot"),
    div({
      class: "layout-actions",
      hidden: state.activity.map((activity) => activity === "settings"),
      onMount: mountMeasuredUiSlot(
        ui.slots,
        workbenchSlots.layoutActions,
        "--layout-actions-width",
      ),
    }),
    windowControls(ui.controls),
    portal("overlays", hoverCard(state)),
    portal("overlays", contextMenu(controller, state)),
    portal("overlays", renameDialog(controller, state)),
    portal("overlays", uiSlot(ui.slots, workbenchSlots.overlays, "extension-overlays")),
    portal(
      "overlays",
      show(state.notice.map(Boolean), () => div(
        {
          class: "notice",
          onMount: () => onTimeout(() => state.notice.set(""), 4_000),
        },
        state.notice,
      )),
    ),
  );
}

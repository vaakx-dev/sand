import {
  derive,
  div,
  dynamicChild,
  keep,
  onTimeout,
  onWindow,
  portal,
  show,
} from "@vaakx-dev/vrui";

import type { UiRegistry } from "@sand/extension-api";

import type { WorkbenchController } from "../controller.ts";
import type { WorkbenchState } from "../state.ts";
import { agentPanel } from "./agent.ts";
import { projectOverlays } from "./projects.ts";
import { settingsWorkspace } from "./settings.ts";
import { sidebar } from "./sidebar.ts";
import { topbar, windowControls } from "./shell/chrome.ts";
import { paneResizer, SIDEBAR_MAX, SIDEBAR_MIN } from "./shell/resizer.ts";
import { globalKeyDown } from "./shell/shortcuts.ts";
import { threadContextMenu } from "./sidebar/threadMenu.ts";
import { threadRenameDialog } from "./sidebar/threadDialog.ts";
import { threadHoverCard } from "./sidebar/threadRow.ts";
import { uiSlot } from "./shared/slot.ts";

export function shell(
  controller: WorkbenchController,
  state: WorkbenchState,
  ui: UiRegistry,
): HTMLElement {
  const columns = derive(() => {
    const left = state.sidebarOpen.get() ? state.sidebarWidth.get() : 0;
    const leftGrip = state.sidebarOpen.get() ? 3 : 0;
    return `${left}px ${leftGrip}px minmax(0, 1fr) auto`;
  });
  const sidebarSpace = derive(() => state.sidebarOpen.get() ? state.sidebarWidth.get() + 3 : 0);

  return div(
    {
      class: "workbench",
      "data-theme": state.theme,
      "data-appearance": state.appearance,
      style: { "--workbench-sidebar-space": sidebarSpace.map((width) => `${width}px`) },
      onMount: (element) => onWindow(
        element,
        "keydown",
        (event) => globalKeyDown(event as KeyboardEvent, controller, state),
      ),
    },
    div(
      {
        class: ["body", {
          "sidebar-visible": state.sidebarOpen,
        }],
        style: { gridTemplateColumns: columns },
      },
      div({ class: "sidebar-slot" }, sidebar(controller, state)),
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
      dynamicChild(
        state.activity,
        (activity) => activity === "settings"
          ? settingsWorkspace(controller, state)
          : div(
              { class: "center-shell" },
              topbar(controller, state, ui.slots),
              div({ class: "main-column" }, agentPanel(controller, state)),
              uiSlot(ui.slots, "workbench.bottom", "bottom-slot"),
            ),
        div({ class: "center-slot" }),
      ),
      uiSlot(ui.slots, "workbench.right", "right-slot"),
    ),
    windowControls(),
    portal("overlays", threadHoverCard(state)),
    portal("overlays", threadContextMenu(controller, state)),
    portal("overlays", threadRenameDialog(controller, state)),
    portal("overlays", projectOverlays(controller, state)),
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

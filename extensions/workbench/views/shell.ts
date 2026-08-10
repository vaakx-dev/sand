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

import type { WorkbenchController } from "../controller.ts";
import type { WorkbenchState } from "../state.ts";
import { agentPanel } from "./agent.ts";
import { projectOverlays } from "./projects.ts";
import { rightPanel } from "./right.ts";
import { settingsWorkspace } from "./settings.ts";
import { sidebar } from "./sidebar.ts";
import { topbar, windowControls } from "./shell/chrome.ts";
import { paneResizer, RIGHT_MAX, RIGHT_MIN, SIDEBAR_MAX, SIDEBAR_MIN } from "./shell/resizer.ts";
import { globalKeyDown } from "./shell/shortcuts.ts";
import { threadContextMenu } from "./sidebar/threadMenu.ts";
import { threadRenameDialog } from "./sidebar/threadDialog.ts";
import { threadHoverCard } from "./sidebar/threadRow.ts";
import { terminal } from "./terminal.ts";

export function shell(controller: WorkbenchController, state: WorkbenchState): HTMLElement {
  const columns = derive(() => {
    const left = state.sidebarOpen.get() ? state.sidebarWidth.get() : 0;
    const leftGrip = state.sidebarOpen.get() ? 3 : 0;
    const rightVisible = state.rightOpen.get() && state.activity.get() !== "settings";
    if (rightVisible && state.rightMaximized.get()) {
      return `${left}px ${leftGrip}px 0 0 minmax(0, 1fr)`;
    }
    const right = rightVisible ? state.rightWidth.get() : 0;
    const rightGrip = rightVisible ? 3 : 0;
    return `${left}px ${leftGrip}px minmax(360px, 1fr) ${rightGrip}px ${right}px`;
  });
  const rightVisible = derive(() => state.rightOpen.get() && state.activity.get() !== "settings");
  const rightResizable = derive(() => rightVisible.get() && !state.rightMaximized.get());

  return div(
    {
      class: "workbench",
      "data-theme": state.theme,
      "data-appearance": state.appearance,
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
          "right-panel-visible": rightVisible,
          "right-panel-maximized": state.rightMaximized,
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
              topbar(controller, state),
              div({ class: "main-column" }, agentPanel(controller, state), terminal(controller, state)),
            ),
        div({ class: "center-slot" }),
      ),
      div(
        { class: "resizer-slot" },
        keep(rightResizable, () => paneResizer(
          "right",
          state.rightWidth,
          RIGHT_MIN,
          RIGHT_MAX,
          controller,
        )),
      ),
      div(
        { class: "right-slot" },
        keep(rightVisible, () => rightPanel(controller, state)),
      ),
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

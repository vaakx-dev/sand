import { div, dynamicChild } from "@vaakx-dev/vrui";

import type { WorkbenchController } from "../controller.ts";
import type { BrowserTab } from "../models.ts";
import type { WorkbenchState } from "../state.ts";
import { browserView } from "./right/browser.ts";
import { changesView } from "./right/changes.ts";
import { rightPanelHeader } from "./right/chrome.ts";
import { filesView } from "./right/files.ts";
import { surfacePicker } from "./right/picker.ts";
import { tasksView } from "./right/tasks.ts";

export function rightPanel(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  return div(
    { class: ["right-panel", { maximized: state.rightMaximized }] },
    rightPanelHeader(controller, state),
    dynamicChild(state.rightActiveTab, (tab) => {
      if (!tab) return surfacePicker(controller, state);
      if (tab.view === "changes") return changesView(state);
      if (tab.view === "tasks") return tasksView(state);
      if (tab.view === "browser") return browserView(state, tab as BrowserTab);
      return filesView(controller, state);
    }),
  );
}

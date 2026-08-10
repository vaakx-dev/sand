import { button, div, icon } from "@vaakx-dev/vrui";
import { ArrowLeft, Settings } from "lucide";

import type { UiControls, UiSlotRegistry } from "@sand/extension-api";

import type { WorkbenchController } from "../controller.ts";
import type { Activity } from "../models.ts";
import type { WorkbenchState } from "../state.ts";
import { extensionsView } from "./sidebar/extensions.ts";
import { settingsNavigation } from "./sidebar/settings.ts";
import * as threads from "./sidebar/threads/view.ts";

export function sidebar(
  controller: WorkbenchController,
  state: WorkbenchState,
  slots: UiSlotRegistry,
  controls: UiControls,
): HTMLElement {
  return div(
    {
      class: "sidebar expanded",
      "aria-hidden": state.sidebarOpen.map((open) => !open),
    },
    div(
      { class: "sidebar-modes" },
      mode(
        state,
        "threads",
        threads.view(controller, state, slots, controls),
      ),
      mode(state, "extensions", extensionsView(controller, state, controls)),
      mode(state, "settings", settingsNavigation(state)),
    ),
    div(
      { class: "sidebar-footer" },
      button(
        {
          class: "sidebar-footer-button",
          hidden: state.activity.map((activity) => activity !== "settings"),
          onClick: () => controller.navigation.show("threads"),
        },
        icon(ArrowLeft, 14),
        "Back",
      ),
      button(
        {
          class: "sidebar-footer-button",
          hidden: state.activity.map((activity) => activity === "settings"),
          onClick: () => controller.navigation.show("settings"),
        },
        icon(Settings, 14),
        "Settings",
      ),
    ),
  );
}

function mode(
  state: WorkbenchState,
  activity: Activity,
  content: HTMLElement,
): HTMLElement {
  return div(
    {
      class: "sidebar-mode",
      hidden: state.activity.map((current) => current !== activity),
    },
    content,
  );
}

import { div, dynamicChild } from "@vaakx-dev/vrui";

import type { UiControls } from "@sand/extension-api";

import type { WorkbenchController } from "../controller.ts";
import type { WorkbenchState } from "../state.ts";
import { appearancePage } from "./settings/appearance.ts";
import { generalPage } from "./settings/general.ts";
import { providersPage } from "./settings/providers.ts";
import { extensionsPage, keybindingsPage } from "./settings/system.ts";

export function settingsWorkspace(
  controller: WorkbenchController,
  state: WorkbenchState,
  controls: UiControls,
): HTMLElement {
  return div(
    {
      class: "settings-workspace",
      hidden: state.activity.map((activity) => activity !== "settings"),
    },
    dynamicChild(state.settingsSection, (section) => {
      switch (section) {
        case "providers": return providersPage(controller, state, controls);
        case "appearance": return appearancePage(controller, state);
        case "keybindings": return keybindingsPage(state);
        case "extensions": return extensionsPage(controller, state);
        default: return generalPage(controller, state);
      }
    }),
  );
}

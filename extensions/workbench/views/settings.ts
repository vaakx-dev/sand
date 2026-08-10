import { div, dynamicChild, span } from "@vaakx-dev/vrui";

import type { WorkbenchController } from "../controller.ts";
import type { WorkbenchState } from "../state.ts";
import { appearancePage } from "./settings/appearance.ts";
import { generalPage } from "./settings/general.ts";
import { providersPage } from "./settings/providers.ts";
import { extensionsPage, keybindingsPage, sourcePage } from "./settings/system.ts";

export function settingsWorkspace(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  return div(
    { class: "settings-workspace" },
    div(
      { class: "settings-workspace-header", "data-tauri-drag-region": "" },
      span("Settings"),
    ),
    dynamicChild(state.settingsSection, (section) => {
      switch (section) {
        case "providers": return providersPage(controller, state);
        case "appearance": return appearancePage(controller, state);
        case "keybindings": return keybindingsPage(state);
        case "source": return sourcePage(controller, state);
        case "extensions": return extensionsPage(controller, state);
        default: return generalPage(controller, state);
      }
    }),
  );
}

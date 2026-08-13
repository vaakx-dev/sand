import { div, dynamicChild } from "@vaakx-dev/vrui";

import type { SandUi } from "sand:api/ui";
import { styled } from "sand:api/ui";

import type { WorkbenchController } from "../controller.ts";
import type { WorkbenchState } from "../state.ts";
import { appearancePage } from "./settings/appearance.ts";
import { generalPage } from "./settings/general.ts";
import { providersPage } from "./settings/providers.ts";
import { extensionsPage, keybindingsPage } from "./settings/system.ts";

const Settings = styled(div, {
  minWidth: 0,
  minHeight: 0,
  flex: 1,
  display: "flex",
  overflow: "hidden",
});

export function settingsWorkspace(
  controller: WorkbenchController,
  state: WorkbenchState,
  controls: SandUi,
): HTMLElement {
  return Settings(
    {
      hidden: state.activity.map((activity) => activity !== "settings"),
    },
    dynamicChild(state.settingsSection, (section) => {
      switch (section) {
        case "providers": return providersPage(controller, state, controls);
        case "appearance": return appearancePage(controller, state, controls);
        case "keybindings": return keybindingsPage(state, controls);
        case "extensions": return extensionsPage(controller, state, controls);
        default: return generalPage(controller, state, controls);
      }
    }),
  );
}

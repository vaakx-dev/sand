import { div, icon } from "@vaakx-dev/vrui";
import { ArrowLeft, RotateCw, Settings } from "lucide";

import type { SandUi } from "sand:api/ui";
import { styled } from "sand:api/ui";
import type { UiSlotRegistry } from "../api.ts";
import type { WorkbenchController } from "../controller.ts";
import type { Activity } from "../models.ts";
import type { WorkbenchState } from "../state.ts";
import { extensionsView } from "./sidebar/extensions.ts";
import { settingsNavigation } from "./sidebar/settings.ts";
import * as threads from "./sidebar/threads/view.ts";

const Sidebar = styled(div, {
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  borderRight: "1px solid var(--border)",
  background: "var(--panel)",
  "&[aria-hidden=true]": { visibility: "hidden" },
});
const Modes = styled(div, { minWidth: 0, minHeight: 0, flex: 1, display: "grid" });
const Mode = styled(div, { minWidth: 0, minHeight: 0, display: "flex" });
const Footer = styled(div, {
  flex: "0 0 auto",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-compact)",
  padding: "var(--space-medium)",
  borderTop: "1px solid var(--border)",
  "> button:first-child, > button:nth-child(2)": {
    minWidth: 0,
    flex: 1,
    justifyContent: "flex-start",
  },
});

export function sidebar(
  controller: WorkbenchController,
  state: WorkbenchState,
  slots: UiSlotRegistry,
  ui: SandUi,
): HTMLElement {
  return Sidebar(
    { "aria-hidden": state.sidebarOpen.map((open) => !open) },
    Modes(
      {},
      mode(state, "threads", threads.view(controller, state, slots, ui)),
      mode(state, "extensions", extensionsView(controller, state, ui)),
      mode(state, "settings", settingsNavigation(state, ui)),
    ),
    Footer(
      {},
      ui.button(
        {
          variant: "ghost",
          hidden: state.activity.map((activity) => activity !== "settings"),
          onClick: () => controller.navigation.show("threads"),
        },
        icon(ArrowLeft, ui.tokens.size.iconCompact),
        "Back",
      ),
      ui.button(
        {
          variant: "ghost",
          hidden: state.activity.map((activity) => activity === "settings"),
          onClick: () => controller.navigation.show("settings"),
        },
        icon(Settings, ui.tokens.size.iconCompact),
        "Settings",
      ),
      ui.iconButton({
        label: "Reload extensions",
        renderIcon: (size) => icon(RotateCw, size),
        busy: state.extensionsReloading,
        disabled: state.extensionsReloading,
        onClick: () => void controller.preferences.reloadExtensions(),
      }),
    ),
  );
}

function mode(state: WorkbenchState, activity: Activity, content: HTMLElement): HTMLElement {
  return Mode(
    { hidden: state.activity.map((current) => current !== activity) },
    content,
  );
}

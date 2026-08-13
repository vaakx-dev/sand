import { div, icon } from "@vaakx-dev/vrui";
import { Blocks, BriefcaseBusiness, Keyboard, Palette, SlidersHorizontal } from "lucide";

import type { SandUi } from "sand:api/ui";
import { styled } from "sand:api/ui";
import type { SettingsSection } from "../../models.ts";
import type { WorkbenchState } from "../../state.ts";
import { sidebarView } from "./shared.ts";

const Navigation = styled(div, {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-small)",
  paddingInline: "var(--space-medium)",
});

export function settingsNavigation(state: WorkbenchState, ui: SandUi): HTMLElement {
  return sidebarView(
    "Settings",
    null,
    Navigation(
      {},
      navItem(ui, state, "general", SlidersHorizontal, "General"),
      navItem(ui, state, "appearance", Palette, "Appearance"),
      navItem(ui, state, "keybindings", Keyboard, "Keybindings"),
      navItem(ui, state, "providers", BriefcaseBusiness, "Providers"),
      navItem(ui, state, "extensions", Blocks, "Extensions"),
    ),
  );
}

function navItem(
  ui: SandUi,
  state: WorkbenchState,
  section: SettingsSection,
  node: Parameters<typeof icon>[0],
  label: string,
): HTMLElement {
  return ui.listItem({
    label,
    selected: state.settingsSection.map((value) => value === section),
    renderIcon: (size) => icon(node, size),
    onClick: state.settingsSection.setter(section),
  });
}

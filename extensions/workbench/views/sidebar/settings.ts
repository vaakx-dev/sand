import { button, div, icon } from "@vaakx-dev/vrui";
import { Blocks, BriefcaseBusiness, GitBranch, Keyboard, Palette, SlidersHorizontal } from "lucide";

import type { SettingsSection } from "../../models.ts";
import type { WorkbenchState } from "../../state.ts";

export function settingsNavigation(state: WorkbenchState): HTMLElement {
  return div(
    { class: "sidebar-view" },
    div({ class: "settings-nav-title" }, "Settings"),
    div(
      { class: "settings-nav panel-scroll" },
      navButton(state, "general", SlidersHorizontal, "General"),
      navButton(state, "appearance", Palette, "Appearance"),
      navButton(state, "keybindings", Keyboard, "Keybindings"),
      navButton(state, "providers", BriefcaseBusiness, "Providers"),
      navButton(state, "source", GitBranch, "Source Control"),
      navButton(state, "extensions", Blocks, "Extensions"),
    ),
  );
}

function navButton(
  state: WorkbenchState,
  section: SettingsSection,
  node: Parameters<typeof icon>[0],
  label: string,
): HTMLElement {
  return button(
    {
      class: ["settings-nav-button", {
        active: state.settingsSection.map((value) => value === section),
      }],
      onClick: state.settingsSection.setter(section),
    },
    icon(node, 14),
    label,
  );
}

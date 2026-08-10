import { button, div, dynamicChild, h2, span } from "@vaakx-dev/vrui";

import type { ThemeContribution } from "@sand/extension-api";

import type { WorkbenchController } from "../../controller.ts";
import type { WorkbenchState } from "../../state.ts";
import { page, settingRow, toggle } from "./shared.ts";

export function appearancePage(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  return page(
    "Appearance",
    span(
      { class: "appearance-description" },
      "Choose how Sand looks. Themes are contributed by extensions and their CSS is loaded directly by the runtime.",
    ),
    h2({ class: "settings-section-heading" }, "Color scheme"),
    div(
      { class: "appearance-modes", role: "group", "aria-label": "Color scheme" },
      ...(["system", "light", "dark"] as const).map((mode) => button(
        {
          class: ["appearance-mode", { active: state.appearance.map((value) => value === mode) }],
          "aria-pressed": state.appearance.map((value) => value === mode),
          onClick: () => {
            state.appearance.set(mode);
            void controller.preferences.saveAppearance();
          },
        },
        div({ class: ["theme-wireframe", mode] }, span(), span(), span()),
        span(mode[0]!.toUpperCase() + mode.slice(1)),
      )),
    ),
    h2({ class: "settings-section-heading" }, "Themes"),
    dynamicChild(state.extensions, (extensions) => div(
      { class: "theme-grid" },
      ...extensions
        .flatMap((extension) => extension.themes ?? [])
        .map((theme) => themeCard(controller, state, theme)),
    )),
    h2({ class: "settings-section-heading" }, "Interface"),
    settingRow(
      "Word wrap",
      "Wrap long lines in code, diffs, and file previews by default.",
      toggle(state.wordWrap, () => void controller.preferences.saveBehavior()),
    ),
  );
}

function themeCard(
  controller: WorkbenchController,
  state: WorkbenchState,
  theme: ThemeContribution,
): HTMLElement {
  const dark = theme.dark ?? theme.light;
  const light = theme.light ?? theme.dark;
  return button(
    {
      class: ["theme-card", { active: state.theme.map((value) => value === theme.id) }],
      "aria-pressed": state.theme.map((value) => value === theme.id),
      onClick: () => {
        state.theme.set(theme.id);
        void controller.preferences.saveAppearance();
      },
    },
    div(
      { class: "theme-preview" },
      light ? div(
        { class: "theme-preview-half", style: { background: light.canvas } },
        span({ style: { background: light.sidebar } }),
        span({ style: { background: light.surface, color: light.accent } }),
      ) : null,
      dark ? div(
        { class: "theme-preview-half", style: { background: dark.canvas } },
        span({ style: { background: dark.sidebar } }),
        span({ style: { background: dark.surface, color: dark.accent } }),
      ) : null,
    ),
    span({ class: "theme-card-label" }, theme.label),
    state.theme.map((value) => value === theme.id ? "Selected" : ""),
  );
}

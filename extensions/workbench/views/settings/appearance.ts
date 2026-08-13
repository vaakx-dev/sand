import { button, div, dynamicChild, h2, span } from "@vaakx-dev/vrui";

import type { ThemeContribution } from "@sand/extension-api";

import type { SandUi } from "sand:api/ui";
import { styled } from "sand:api/ui";
import { tokens } from "sand:api/ui";
import type { WorkbenchController } from "../../controller.ts";
import type { WorkbenchState } from "../../state.ts";

const Grid = styled(div, {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(176px, 1fr))",
  gap: tokens.space.medium,
});

const Modes = styled(Grid, { gridTemplateColumns: "repeat(3, minmax(0, 1fr))" });

const Choice = styled(button, {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: tokens.space.medium,
  padding: tokens.space.medium,
  border: "1px solid var(--border)",
  borderRadius: tokens.radius.surface,
  color: "var(--muted)",
  background: "var(--surface)",
  cursor: "pointer",
  textAlign: "left",
  "&:hover": { color: "var(--text)", background: "var(--elevated)" },
  "&[aria-pressed=true]": {
    borderColor: "var(--accent)",
    color: "var(--text)",
    boxShadow: "inset 0 0 0 1px var(--accent)",
  },
});

const Wireframe = styled(div, {
  position: "relative",
  width: "100%",
  height: 96,
  overflow: "hidden",
  border: "1px solid var(--border)",
  borderRadius: tokens.radius.control,
  "> span": { position: "absolute", display: "block", borderRadius: tokens.radius.compact, background: "currentColor" },
  "> span:nth-child(1)": { inset: `${tokens.space.medium}px auto ${tokens.space.medium}px ${tokens.space.medium}px`, width: "24%" },
  "> span:nth-child(2)": { top: tokens.space.section, left: "34%", right: tokens.space.large, height: tokens.space.medium },
  "> span:nth-child(3)": { top: tokens.space.page, left: "34%", right: "22%", height: tokens.size.controlLarge },
});

const ThemePreview = styled(div, {
  width: "100%",
  height: 96,
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  overflow: "hidden",
  border: "1px solid var(--border)",
  borderRadius: tokens.radius.control,
});

const Palette = styled(div, {
  position: "relative",
  overflow: "hidden",
  "> span:first-child": { position: "absolute", inset: "0 auto 0 0", width: "28%" },
  "> span:last-child": {
    position: "absolute",
    left: "37%",
    right: "9%",
    top: "18%",
    bottom: "24%",
    borderRadius: tokens.radius.compact,
    borderBottom: `${tokens.space.small}px solid currentColor`,
  },
});

const ThemeLabel = styled(span, { color: "var(--text)", fontSize: tokens.font.label, fontWeight: tokens.weight.semibold });

export function appearancePage(
  controller: WorkbenchController,
  state: WorkbenchState,
  ui: SandUi,
): HTMLElement {
  return ui.page(
    {
      title: "Appearance",
      description: "Choose how Sand looks. Themes are palette data contributed by extensions.",
    },
    h2("Color scheme"),
    Modes(
      { role: "group", "aria-label": "Color scheme" },
      ...(["system", "light", "dark"] as const).map((mode) => Choice(
        {
          "aria-pressed": state.appearance.map((value) => value === mode),
          onClick: () => {
            state.appearance.set(mode);
            void controller.preferences.saveAppearance();
          },
        },
        Wireframe(
          {
            style: {
              background: mode === "dark" ? "#000000" : mode === "light" ? "#ffffff" : "linear-gradient(90deg, #ffffff 50%, #000000 50%)",
              color: mode === "light" ? "#eeeeee" : "#141414",
            },
          },
          span(), span(), span(),
        ),
        span(mode[0]!.toUpperCase() + mode.slice(1)),
      )),
    ),
    h2("Themes"),
    dynamicChild(state.extensions, (extensions) => Grid(
      {},
      ...extensions.flatMap((extension) => extension.themes ?? [])
        .map((theme) => themeCard(controller, state, theme)),
    )),
  );
}

function themeCard(
  controller: WorkbenchController,
  state: WorkbenchState,
  theme: ThemeContribution,
): HTMLElement {
  const dark = theme.dark ?? theme.light;
  const light = theme.light ?? theme.dark;
  return Choice(
    {
      "aria-pressed": state.theme.map((value) => value === theme.id),
      onClick: () => {
        state.theme.set(theme.id);
        void controller.preferences.saveAppearance();
      },
    },
    ThemePreview(
      {},
      light ? Palette(
        { style: { background: light.background, color: light.accent } },
        span({ style: { background: light.panel } }),
        span({ style: { background: light.surface } }),
      ) : null,
      dark ? Palette(
        { style: { background: dark.background, color: dark.accent } },
        span({ style: { background: dark.panel } }),
        span({ style: { background: dark.surface } }),
      ) : null,
    ),
    ThemeLabel({}, theme.label),
    state.theme.map((value) => value === theme.id ? "Selected" : ""),
  );
}

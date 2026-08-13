import type { ThemeContribution, ThemePalette } from "@sand/extension-api";

export const FALLBACK_THEME: ThemeContribution = {
  id: "sand",
  label: "Sand",
  dark: {
    background: "#050505",
    panel: "#121212",
    surface: "#1c1c1c",
    elevated: "#262626",
    border: "#1a1a1a",
    outline: "#2a2a2a",
    text: "#e6e6e6",
    muted: "#9a9a9a",
    accent: "#ffffff",
    danger: "#df7b82",
    warning: "#d9aa5f",
    success: "#75b587",
  },
  light: {
    background: "#ffffff",
    panel: "#f7f7f7",
    surface: "#eeeeee",
    elevated: "#e4e4e4",
    border: "#e8e8e8",
    outline: "#d6d6d6",
    text: "#202020",
    muted: "#737373",
    accent: "#3f3f46",
    danger: "#b94f59",
    warning: "#9a6b22",
    success: "#397b4e",
  },
};

const VARIABLES: Record<keyof ThemePalette, string> = {
  background: "--background",
  panel: "--panel",
  surface: "--surface",
  elevated: "--elevated",
  border: "--border",
  outline: "--outline",
  text: "--text",
  muted: "--muted",
  accent: "--accent",
  danger: "--danger",
  warning: "--warning",
  success: "--success",
};

export function themeVariables(palette: ThemePalette): Record<string, string> {
  return Object.fromEntries(
    Object.entries(VARIABLES).map(([role, variable]) => [
      variable,
      palette[role as keyof ThemePalette],
    ]),
  );
}

export function applyTheme(
  contribution: ThemeContribution | undefined,
  appearance: "light" | "dark" | "system",
): () => void {
  const root = document.documentElement;
  const theme = contribution ?? FALLBACK_THEME;
  const media = globalThis.matchMedia("(prefers-color-scheme: light)");
  const update = () => {
    const mode = appearance === "system" ? (media.matches ? "light" : "dark") : appearance;
    const palette = theme[mode] ?? FALLBACK_THEME[mode]!;
    root.dataset.theme = theme.id;
    root.dataset.appearance = appearance;
    root.style.colorScheme = mode;
    for (const [variable, color] of Object.entries(themeVariables(palette))) {
      root.style.setProperty(variable, color);
    }
  };
  update();
  if (appearance !== "system") return () => undefined;
  media.addEventListener("change", update);
  return () => media.removeEventListener("change", update);
}

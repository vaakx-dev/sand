export type ThemeAppearance = "light" | "dark";

export interface ThemePalette {
  background: string;
  panel: string;
  surface: string;
  elevated: string;
  border: string;
  outline: string;
  text: string;
  muted: string;
  accent: string;
  danger: string;
  warning: string;
  success: string;
}

export interface ThemeContribution {
  id: string;
  label: string;
  light?: ThemePalette;
  dark?: ThemePalette;
}

export type ExtensionTarget = "app" | "ui";

export interface ExtensionApiContribution {
  target: ExtensionTarget;
  module: string;
}

export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  uses?: string[];
  provides?: Record<string, ExtensionApiContribution>;
  app?: string;
  ui?: string;
  themes?: ThemeContribution[];
}

export interface ExtensionDescription extends ExtensionManifest {
  root: string;
  source: "builtin" | "user";
  enabled: boolean;
  appActive: boolean;
  uiActive: boolean;
  contributions: string[];
  errors: string[];
}

export interface UiBundle {
  manifest: ExtensionManifest;
  source: string;
  bindings: Record<string, string>;
  provided: string[];
}

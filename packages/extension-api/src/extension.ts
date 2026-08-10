export type ThemeAppearance = "light" | "dark";

export interface ThemePreview {
  canvas: string;
  sidebar: string;
  surface: string;
  text: string;
  accent: string;
}

export interface ThemeContribution {
  id: string;
  label: string;
  light?: ThemePreview;
  dark?: ThemePreview;
}

export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  requires?: string[];
  main?: string;
  ui?: string;
  styles?: string[];
  themes?: ThemeContribution[];
}

export interface ExtensionDescription extends ExtensionManifest {
  root: string;
  source: "builtin" | "user" | "workspace";
  enabled: boolean;
  hostActive: boolean;
  uiActive: boolean;
  contributions: string[];
}

export interface UiBundle {
  manifest: ExtensionManifest;
  source?: string;
  styles: string[];
  fingerprint: string;
}

import type { Sig } from "@vaakx-dev/vrui";
import type { UiSurfaceContribution } from "@sand/extension-api";

export interface BrowserTab {
  input: Sig<string>;
  request: Sig<{ id: number; url: string }>;
}

export interface PanelTab {
  id: string;
  surface: UiSurfaceContribution;
  node: HTMLElement;
}

export interface GitState {
  repository: boolean;
  status: string;
  diff: string;
}

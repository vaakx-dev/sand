import type {
  AgentProviderDescription,
  AgentProviderModel,
  ThreadChangeRequestState,
} from "@sand/extension-api";

export type Activity = "threads" | "extensions" | "settings";
export type ProjectPickerIntent = "switch" | "newThread";
export type SettingsSection = "general" | "appearance" | "keybindings" | "providers" | "source" | "extensions";
export type AppearanceMode = "system" | "light" | "dark";

export interface ProviderModel extends AgentProviderModel {
  favorite: boolean;
  hidden: boolean;
}

export type ProviderModels = Record<string, ProviderModel[]>;
export type ProviderDescription = AgentProviderDescription;

export interface ProjectDescription {
  name: string;
  path: string;
  updatedAt: string;
}

export interface GitStatus {
  repository: boolean;
  output: string;
  error: string;
  changeRequestState: ThreadChangeRequestState | null;
}

export interface GitDiff {
  repository: boolean;
  diff: string;
  error: string;
}

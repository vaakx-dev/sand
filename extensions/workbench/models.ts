import type {
  AgentProviderDescription,
  AgentProviderModel,
} from "@sand/extension-api";

export type Activity = "threads" | "extensions" | "settings";
export type SettingsSection = "general" | "appearance" | "keybindings" | "providers" | "extensions";
export type AppearanceMode = "system" | "light" | "dark";

export interface ProviderModel extends AgentProviderModel {
  favorite: boolean;
  hidden: boolean;
}

export type ProviderModels = Record<string, ProviderModel[]>;
export type ProviderDescription = AgentProviderDescription;

import type {
  AgentMessage,
  AgentSessionSummary,
  ThreadChangeRequestState,
} from "@sand/extension-api";

export type Activity = "threads" | "extensions" | "settings";
export type ProjectPickerIntent = "switch" | "newThread";
export type SettingsSection = "general" | "appearance" | "keybindings" | "providers" | "source" | "extensions";
export type AppearanceMode = "system" | "light" | "dark";
export type ReasoningEffort = "low" | "medium" | "high" | "xhigh" | "max" | "ultra";
export type ServiceTier = "standard" | "fast";

export const CHATGPT_MODELS = [
  "gpt-5.6-sol",
  "gpt-5.6-luna",
  "gpt-5.6-terra",
  "gpt-5.5",
  "gpt-5.4",
] as const;

export interface ProviderModel {
  slug: string;
  favorite: boolean;
  hidden: boolean;
}

export type ProviderModels = Record<string, ProviderModel[]>;

export interface ProviderDescription {
  id: string;
  name: string;
  defaultModel: string;
}

export interface ProjectDescription {
  name: string;
  path: string;
  updatedAt: string;
}

export interface ChatGptAuth {
  authenticated: boolean;
  accountId: string;
  expiresAt: string;
}

export interface AgentSession extends AgentSessionSummary {
  messages: AgentMessage[];
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

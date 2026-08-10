import type {
  AgentMessage,
  AgentSessionSummary,
  ExtensionDescription,
  JsonObject,
  ThreadChangeRequestState,
} from "@sand/extension-api";
import type { Sig } from "@vaakx-dev/vrui";

export type Activity = "threads" | "explorer" | "search" | "extensions" | "settings";
export type RightView = "files" | "changes" | "tasks" | "browser";
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

export interface FileTreeNode {
  name: string;
  path: string;
  kind: "directory" | "file";
  children?: FileTreeNode[];
}

export interface EditorTab {
  path: string;
  name: string;
  content: string;
  savedContent: string;
}

export interface SearchResult {
  path: string;
  line: number;
  column: number;
  text: string;
}

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

export interface ToolActivity {
  id: string;
  name: string;
  status: "running" | "complete";
  detail: string;
}

export interface PlanStep {
  step: string;
  status: "pending" | "in_progress" | "completed";
}

export interface BrowserRequest {
  id: number;
  url: string;
}

export interface BrowserTab {
  id: string;
  view: "browser";
  input: Sig<string>;
  url: Sig<string>;
  request: Sig<BrowserRequest>;
}

export interface StaticRightTab {
  id: Exclude<RightView, "browser">;
  view: Exclude<RightView, "browser">;
}

export type RightTab = BrowserTab | StaticRightTab;

export interface TerminalLine {
  id: number;
  terminalId: string;
  stream: "command" | "stdout" | "stderr" | "prompt" | "status";
  text: string;
}

export interface TerminalPane {
  id: string;
  cwd: string;
  status: "running" | "exited";
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

export interface WorkbenchData {
  root: string;
  tree: FileTreeNode[];
  tabs: EditorTab[];
  activePath: string | null;
  searchResults: SearchResult[];
  providers: ProviderDescription[];
  sessions: AgentSessionSummary[];
  extensions: ExtensionDescription[];
  messages: AgentMessage[];
  tools: ToolActivity[];
  terminal: TerminalLine[];
  settings: JsonObject;
}

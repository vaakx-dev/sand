import { sig } from "@vaakx-dev/vrui";

import type { JsonObject } from "@sand/extension-api";

import type {
  Activity,
  AppearanceMode,
  ChatGptAuth,
  ProjectDescription,
  ProjectPickerIntent,
  ProviderDescription,
  ProviderModels,
  ReasoningEffort,
  SettingsSection,
  ServiceTier,
} from "./models.ts";
import type {
  AgentMessage,
  AgentSessionSummary,
  ExtensionDescription,
  UiCommand,
} from "@sand/extension-api";

export function createState() {
  const activity = sig<Activity>("threads");
  const sidebarOpen = sig(true);
  const sidebarWidth = sig(272);
  const settledOpen = sig(true);
  const snoozedOpen = sig(false);
  const settledLimit = sig(10);
  const autoSettleDays = sig<number | null>(3);
  const threadQuery = sig("");
  const threadPreview = sig<AgentSessionSummary | null>(null);
  const threadPreviewTop = sig(0);
  const threadMenu = sig<{ session: AgentSessionSummary; x: number; y: number } | null>(null);
  const threadSnoozeOpen = sig(false);
  const threadRename = sig<{ id: string; title: string } | null>(null);
  const threadRenameInput = sig("");
  const projectMenuOpen = sig(false);
  const projectPickerOpen = sig(false);
  const projectPickerIntent = sig<ProjectPickerIntent>("switch");
  const projectSourceOpen = sig(false);
  const projectSourceView = sig<"sources" | "git">("sources");
  const projectQuery = sig("");
  const projectIndex = sig(0);
  const projectSourceIndex = sig(0);
  const projectCloneUrl = sig("");
  const projects = sig<ProjectDescription[]>([]);
  const settingsSection = sig<SettingsSection>("general");
  const appearance = sig<AppearanceMode>("system");
  const theme = sig("sand");
  const root = sig("");
  const providers = sig<ProviderDescription[]>([]);
  const sessions = sig<AgentSessionSummary[]>([]);
  const provider = sig("echo");
  const model = sig("local");
  const modelPickerOpen = sig(false);
  const modelQuery = sig("");
  const modelIndex = sig(0);
  const modelSource = sig("favorites");
  const providerModels = sig<ProviderModels>({});
  const providerSections = sig<Record<string, boolean>>({ chatgpt: true });
  const providerModelInputs = sig<Record<string, string>>({});
  const traitsOpen = sig(false);
  const reasoning = sig<ReasoningEffort>("high");
  const serviceTier = sig<ServiceTier>("standard");
  const titleProvider = sig("chatgpt");
  const titleModel = sig("gpt-5.6-sol");
  const titleReasoning = sig<ReasoningEffort>("medium");
  const openMenuOpen = sig(false);
  const messages = sig<AgentMessage[]>([]);
  const prompt = sig("");
  const sessionId = sig<string | null>(null);
  const agentStatus = sig<AgentSessionSummary["status"]>("idle");
  const agentDelta = sig("");
  const gitStatus = sig("");
  const gitDiff = sig("");
  const gitRepository = sig(false);
  const extensions = sig<ExtensionDescription[]>([]);
  const settings = sig<JsonObject>({});
  const commands = sig<UiCommand[]>([]);
  const notice = sig("");
  const chatgptAuth = sig<ChatGptAuth>({ authenticated: false, accountId: "", expiresAt: "" });
  const authBusy = sig(false);

  return {
    activity,
    sidebarOpen,
    sidebarWidth,
    settledOpen,
    snoozedOpen,
    settledLimit,
    autoSettleDays,
    threadQuery,
    threadPreview,
    threadPreviewTop,
    threadMenu,
    threadSnoozeOpen,
    threadRename,
    threadRenameInput,
    projectMenuOpen,
    projectPickerOpen,
    projectPickerIntent,
    projectSourceOpen,
    projectSourceView,
    projectQuery,
    projectIndex,
    projectSourceIndex,
    projectCloneUrl,
    projects,
    settingsSection,
    appearance,
    theme,
    root,
    providers,
    sessions,
    provider,
    model,
    modelPickerOpen,
    modelQuery,
    modelIndex,
    modelSource,
    providerModels,
    providerSections,
    providerModelInputs,
    traitsOpen,
    reasoning,
    serviceTier,
    titleProvider,
    titleModel,
    titleReasoning,
    openMenuOpen,
    messages,
    prompt,
    sessionId,
    agentStatus,
    agentDelta,
    gitStatus,
    gitDiff,
    gitRepository,
    extensions,
    settings,
    commands,
    notice,
    chatgptAuth,
    authBusy,
  };
}

export type WorkbenchState = ReturnType<typeof createState>;

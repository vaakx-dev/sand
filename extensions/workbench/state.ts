import { sig } from "@vaakx-dev/vrui";

import type {
  AgentMessage,
  AgentAttempt,
  AgentProviderConnectionState,
  AgentRun,
  AgentThreadSummary,
  ExtensionDescription,
  JsonObject,
  UiCommand,
} from "@sand/extension-api";

import type {
  Activity,
  AppearanceMode,
  ProjectDescription,
  ProjectPickerIntent,
  ProviderDescription,
  ProviderModels,
  SettingsSection,
} from "./models.ts";
export function createState() {
  const activity = sig<Activity>("threads");
  const sidebarOpen = sig(true);
  const sidebarWidth = sig(272);
  const settledOpen = sig(true);
  const snoozedOpen = sig(false);
  const settledLimit = sig(10);
  const autoSettleDays = sig<number | null>(3);
  const threadQuery = sig("");
  const threadPreview = sig<AgentThreadSummary | null>(null);
  const threadPreviewTop = sig(0);
  const threadMenu = sig<{ thread: AgentThreadSummary; x: number; y: number } | null>(null);
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
  const threads = sig<AgentThreadSummary[]>([]);
  const provider = sig("");
  const model = sig("");
  const modelPickerOpen = sig(false);
  const modelQuery = sig("");
  const modelIndex = sig(0);
  const modelSource = sig("favorites");
  const providerModels = sig<ProviderModels>({});
  const providerSections = sig<Record<string, boolean>>({});
  const providerModelInputs = sig<Record<string, string>>({});
  const traitsOpen = sig(false);
  const reasoning = sig("");
  const serviceTier = sig("");
  const titleProvider = sig("");
  const titleModel = sig("");
  const titleReasoning = sig("");
  const openMenuOpen = sig(false);
  const messages = sig<AgentMessage[]>([]);
  const runs = sig<AgentRun[]>([]);
  const attempts = sig<AgentAttempt[]>([]);
  const prompt = sig("");
  const threadId = sig<string | null>(null);
  const agentStatus = sig<AgentThreadSummary["status"]>("idle");
  const agentDelta = sig("");
  const gitStatus = sig("");
  const gitDiff = sig("");
  const gitRepository = sig(false);
  const extensions = sig<ExtensionDescription[]>([]);
  const settings = sig<JsonObject>({});
  const commands = sig<UiCommand[]>([]);
  const notice = sig("");
  const providerConnections = sig<Record<string, AgentProviderConnectionState>>({});
  const providerConnectionBusy = sig<Record<string, boolean>>({});

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
    threads,
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
    runs,
    attempts,
    prompt,
    threadId,
    agentStatus,
    agentDelta,
    gitStatus,
    gitDiff,
    gitRepository,
    extensions,
    settings,
    commands,
    notice,
    providerConnections,
    providerConnectionBusy,
  };
}

export type WorkbenchState = ReturnType<typeof createState>;

import { derive, sig } from "@vaakx-dev/vrui";

import type { JsonObject } from "@sand/extension-api";

import type {
  Activity,
  AppearanceMode,
  ChatGptAuth,
  EditorTab,
  FileTreeNode,
  PlanStep,
  ProjectDescription,
  ProjectPickerIntent,
  ProviderDescription,
  ProviderModels,
  ReasoningEffort,
  RightTab,
  SearchResult,
  SettingsSection,
  ServiceTier,
  TerminalLine,
  TerminalPane,
  ToolActivity,
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
  const rightOpen = sig(false);
  const rightWidth = sig(430);
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
  const wordWrap = sig(true);
  const autoOpenTasks = sig(true);
  const root = sig("");
  const tree = sig<FileTreeNode[]>([]);
  const tabs = sig<EditorTab[]>([]);
  const activePath = sig<string | null>(null);
  const activeTab = derive(() => tabs.get().find((tab) => tab.path === activePath.get()) ?? null);
  const dirty = derive(() => tabs.get().some((tab) => tab.content !== tab.savedContent));
  const searchQuery = sig("");
  const searchResults = sig<SearchResult[]>([]);
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
  const tools = sig<ToolActivity[]>([]);
  const planDescription = sig("");
  const planSteps = sig<PlanStep[]>([]);
  const planUpdatedAt = sig("");
  const terminal = sig<TerminalLine[]>([]);
  const terminalPanes = sig<TerminalPane[]>([]);
  const terminalActiveId = sig<string | null>(null);
  const terminalLayout = sig<"columns" | "rows">("columns");
  const terminalCommands = sig<Record<string, string>>({});
  const terminalReady = sig<Record<string, boolean>>({});
  const terminalHeight = sig(260);
  const bottomOpen = sig(false);
  const rightTabs = sig<RightTab[]>([]);
  const rightActiveId = sig<string | null>(null);
  const rightActiveTab = derive(() =>
    rightTabs.get().find((tab) => tab.id === rightActiveId.get()) ?? null
  );
  const rightAddOpen = sig(false);
  const rightMaximized = sig(false);
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
    rightOpen,
    rightWidth,
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
    wordWrap,
    autoOpenTasks,
    root,
    tree,
    tabs,
    activePath,
    activeTab,
    dirty,
    searchQuery,
    searchResults,
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
    tools,
    planDescription,
    planSteps,
    planUpdatedAt,
    terminal,
    terminalPanes,
    terminalActiveId,
    terminalLayout,
    terminalCommands,
    terminalReady,
    terminalHeight,
    bottomOpen,
    rightTabs,
    rightActiveId,
    rightActiveTab,
    rightAddOpen,
    rightMaximized,
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

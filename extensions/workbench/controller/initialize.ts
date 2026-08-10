import { batch } from "@vaakx-dev/vrui";

import {
  booleanValue,
  numberValue,
  objectValue,
  stringValue,
  type AgentSessionSummary,
  type ExtensionDescription,
  type JsonObject,
} from "@sand/extension-api";

import type {
  ChatGptAuth,
  FileTreeNode,
  GitDiff,
  GitStatus,
  ProjectDescription,
  ProviderDescription,
} from "../models.ts";
import { ControllerRuntime } from "./runtime.ts";
import {
  appearanceValue,
  providerModelsValue,
  reasoningValue,
  serviceTierValue,
} from "./values.ts";

export async function initializeWorkbench(runtime: ControllerRuntime): Promise<void> {
  const [workspace, tree, providers, sessions, extensions, settings, gitStatus, gitDiff, auth, projects] = await Promise.all([
    runtime.command<{ root: string }>("workspace.info"),
    runtime.command<FileTreeNode[]>("workspace.tree", { depth: 6 }),
    runtime.call<ProviderDescription[]>("agent.providers"),
    runtime.call<AgentSessionSummary[]>("agent.sessions"),
    runtime.call<ExtensionDescription[]>("extensions.list"),
    runtime.call<JsonObject>("settings.all"),
    runtime.command<GitStatus>("git.status"),
    runtime.command<GitDiff>("git.diff"),
    runtime.command<ChatGptAuth>("chatgpt.auth.status"),
    runtime.command<ProjectDescription[]>("projects.list"),
  ]);
  const savedProvider = stringValue(settings["workbench.provider"]);
  const selected = providers.find((item) => item.id === savedProvider) || providers[0];
  const savedModel = stringValue(settings["workbench.model"]);
  const providerSettings = objectValue(settings["provider.chatgpt"] ?? null);
  const catalog = providerModelsValue(settings["workbench.providerModels"], providers);
  const titleSettings = objectValue(settings["agent.titleGeneration"] ?? null);
  const titleProvider = providers.some((provider) => provider.id === titleSettings.provider)
    ? stringValue(titleSettings.provider)
    : providers.find((provider) => provider.id === "chatgpt")?.id || selected?.id || "";
  const titleModels = catalog[titleProvider] ?? [];
  const titleModel = titleModels.some((model) => model.slug === titleSettings.model)
    ? stringValue(titleSettings.model)
    : titleModels.find((model) => !model.hidden)?.slug || titleModels[0]?.slug || "";
  const state = runtime.state;

  batch(() => {
    state.root.set(workspace.root);
    state.tree.set(tree);
    state.providers.set(providers);
    state.sessions.set(sessions);
    state.extensions.set(extensions);
    state.settings.set(settings);
    state.gitStatus.set(gitStatus.output || gitStatus.error);
    state.gitDiff.set(gitDiff.diff || gitDiff.error);
    state.gitRepository.set(gitStatus.repository);
    state.chatgptAuth.set(auth);
    state.projects.set(projects);
    state.sidebarWidth.set(numberValue(settings["workbench.sidebarWidth"], 272));
    state.rightWidth.set(numberValue(settings["workbench.right_width"], 430));
    state.terminalHeight.set(numberValue(settings["workbench.terminal_height"], 260));
    state.sidebarOpen.set(booleanValue(settings["workbench.sidebarOpen"], true));
    const rightOpen = booleanValue(settings["workbench.right_open"], false);
    state.rightOpen.set(rightOpen);
    state.rightMaximized.set(booleanValue(settings["workbench.right_maximized"], false));
    state.rightTabs.set([]);
    state.rightActiveId.set(null);
    state.appearance.set(appearanceValue(settings["workbench.appearance"]));
    state.theme.set(stringValue(settings["workbench.theme"]) || "sand");
    state.wordWrap.set(booleanValue(settings["workbench.word_wrap"], true));
    state.autoOpenTasks.set(booleanValue(settings["workbench.auto_open_tasks"], true));
    const autoSettleDays = settings["workbench.autoSettleDays"];
    state.autoSettleDays.set(autoSettleDays === null
      ? null
      : typeof autoSettleDays === "number" && autoSettleDays >= 0
        ? autoSettleDays
        : 3);
    state.providerModels.set(catalog);
    state.reasoning.set(reasoningValue(providerSettings.reasoning));
    state.serviceTier.set(serviceTierValue(providerSettings.serviceTier));
    state.titleProvider.set(titleProvider);
    state.titleModel.set(titleModel);
    state.titleReasoning.set(reasoningValue(titleSettings.reasoning, "medium"));
    if (selected) {
      state.provider.set(selected.id);
      state.model.set(savedModel || selected.defaultModel);
    }
  });
}

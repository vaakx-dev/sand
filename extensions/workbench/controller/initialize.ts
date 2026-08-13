import { batch } from "@vaakx-dev/vrui";

import {
  errorMessage,
  numberValue,
  objectValue,
  selectProviderOption,
  stringValue,
  type AgentProviderConnectionState,
  type AgentProviderDescription,
  type AgentThreadSummary,
  type ExtensionDescription,
  type JsonObject,
  type WorkspaceScope,
} from "@sand/extension-api";

import type { ProviderDescription } from "../models.ts";
import { providerCatalog } from "../providerCatalog.ts";
import { ControllerRuntime } from "./runtime.ts";
import {
  findModel,
  findProvider,
} from "../modelCatalog.ts";
import {
  appearanceValue,
  providerModelsValue,
} from "./values.ts";

export async function initializeWorkbench(runtime: ControllerRuntime): Promise<void> {
  await runtime.runWorkspace(loadWorkbench);
}

async function loadWorkbench(
  runtime: ControllerRuntime,
  scope: WorkspaceScope,
): Promise<void> {
  const [connected, threads, extensions, settings] = await Promise.all([
    runtime.call<AgentProviderDescription[]>("agent.providers"),
    runtime.call<AgentThreadSummary[]>("threads.list"),
    runtime.call<ExtensionDescription[]>("extensions.list"),
    runtime.call<JsonObject>("settings.all"),
  ]);
  const providers = providerCatalog(runtime.workbench.providers.list(), connected);
  const connections = await connectionStates(providers);
  const catalog = providerModelsValue(settings["workbench.providerModels"], providers);
  const savedSelection = objectValue(settings["workbench.selection"] ?? null);
  const savedProvider = findProvider(providers, stringValue(savedSelection.provider));
  const selectedModel = savedProvider
    ? findModel(catalog, savedProvider.id, stringValue(savedSelection.model))
    : undefined;
  const selected = selectedModel ? savedProvider : undefined;
  const providerSettings = objectValue(settings[`provider.${selected?.id ?? ""}`] ?? null);
  const titleSettings = objectValue(settings["threads.titleGeneration"] ?? null);
  const savedTitleProvider = stringValue(titleSettings.provider);
  const titleModel = findModel(catalog, savedTitleProvider, stringValue(titleSettings.model));
  const titleProvider = titleModel ? savedTitleProvider : "";
  const state = runtime.state;

  scope.commit(() => batch(() => {
    state.root.set(scope.workspace.path);
    state.providers.set(providers);
    state.threads.items.set(threads);
    state.extensions.set(extensions);
    state.settings.set(settings);
    state.providerConnections.set(connections);
    state.sidebarWidth.set(numberValue(settings["workbench.sidebarWidth"], 272));
    state.sidebarOpen.set(true);
    state.appearance.set(appearanceValue(settings["workbench.appearance"]));
    state.theme.set(stringValue(settings["workbench.theme"]) || "sand");
    const autoSettleDays = settings["workbench.autoSettleDays"];
    state.threads.autoSettleDays.set(autoSettleDays === null
      ? null
      : typeof autoSettleDays === "number" && autoSettleDays >= 0
        ? autoSettleDays
        : 3);
    state.providerModels.set(catalog);
    state.reasoning.set(selectProviderOption(
      providerSettings.reasoning,
      selectedModel?.reasoning ?? [],
      selectedModel?.defaultReasoning ?? "",
    ));
    state.serviceTier.set(selectProviderOption(
      providerSettings.serviceTier,
      selectedModel?.serviceTiers ?? [],
      selectedModel?.defaultServiceTier ?? "",
    ));
    state.titleProvider.set(titleProvider);
    state.titleModel.set(titleModel?.slug ?? "");
    state.titleReasoning.set(selectProviderOption(
      titleSettings.reasoning,
      titleModel?.reasoning ?? [],
      titleModel?.defaultReasoning ?? "",
    ));
    state.provider.set(selected?.id ?? "");
    state.model.set(selectedModel?.slug ?? "");
  }));
}

async function connectionStates(
  providers: ProviderDescription[],
): Promise<Record<string, AgentProviderConnectionState>> {
  const entries = await Promise.all(providers.flatMap((provider) => {
    const connection = provider.connection;
    if (!connection) return [];
    return [connection.status()
      .then((state) => [provider.id, state] as const)
      .catch((error) => [provider.id, {
        available: false,
        label: "Unavailable",
        description: errorMessage(error),
      }] as const)];
  }));
  return Object.fromEntries(entries);
}

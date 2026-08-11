import { batch } from "@vaakx-dev/vrui";

import {
  errorMessage,
  numberValue,
  objectValue,
  selectProviderOption,
  stringValue,
  type AgentProviderConnectionState,
  type AgentThreadSummary,
  type ExtensionDescription,
  type JsonObject,
  type JsonValue,
  type WorkspaceScope,
} from "@sand/extension-api";

import type { ProviderDescription } from "../models.ts";
import { ControllerRuntime } from "./runtime.ts";
import {
  findModel,
  findProvider,
  firstModel,
} from "../modelCatalog.ts";
import {
  appearanceValue,
  providerConnectionValue,
  providerModelsValue,
} from "./values.ts";

export async function initializeWorkbench(runtime: ControllerRuntime): Promise<void> {
  await runtime.runWorkspace(loadWorkbench);
}

async function loadWorkbench(
  runtime: ControllerRuntime,
  scope: WorkspaceScope,
): Promise<void> {
  const [providers, threads, extensions, settings] = await Promise.all([
    runtime.call<ProviderDescription[]>("agent.providers"),
    runtime.call<AgentThreadSummary[]>("threads.list"),
    runtime.call<ExtensionDescription[]>("extensions.list"),
    runtime.call<JsonObject>("settings.all"),
  ]);
  const connections = await connectionStates(runtime, providers);
  const savedProvider = stringValue(settings["workbench.provider"]);
  const selected = providers.find((item) => item.id === savedProvider) || providers[0];
  const savedModel = stringValue(settings["workbench.model"]);
  const catalog = providerModelsValue(settings["workbench.providerModels"], providers);
  const selectedModel = selected
    ? findModel(catalog, selected.id, savedModel) ?? firstModel(catalog, selected)
    : undefined;
  const providerSettings = objectValue(settings[`provider.${selected?.id ?? ""}`] ?? null);
  const titleSettings = objectValue(settings["agent.titleGeneration"] ?? null);
  const titleProvider = providers.some((provider) => provider.id === titleSettings.provider)
    ? stringValue(titleSettings.provider)
    : selected?.id || "";
  const titleModels = catalog[titleProvider] ?? [];
  const titleModel = titleModels.find((model) => model.slug === titleSettings.model)
    ?? firstModel(catalog, findProvider(providers, titleProvider));
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
    if (selected) {
      state.provider.set(selected.id);
      state.model.set(selectedModel?.slug || selected.defaultModel);
    }
  }));
}

async function connectionStates(
  runtime: ControllerRuntime,
  providers: ProviderDescription[],
): Promise<Record<string, AgentProviderConnectionState>> {
  const entries = await Promise.all(providers.flatMap((provider) => {
    const command = provider.presentation?.connection?.statusCommand;
    if (!command) return [];
    return [runtime.command<JsonValue>(command)
      .then((state) => [provider.id, providerConnectionValue(state)] as const)
      .catch((error) => [provider.id, {
        available: false,
        label: "Unavailable",
        description: errorMessage(error),
      }] as const)];
  }));
  return Object.fromEntries(entries);
}

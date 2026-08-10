import { sig } from "@vaakx-dev/vrui";

import type {
  AgentProviderConnectionState,
  ExtensionDescription,
  JsonObject,
  UiCommand,
} from "@sand/extension-api";

import type {
  Activity,
  AppearanceMode,
  ProviderDescription,
  ProviderModels,
  SettingsSection,
} from "./models.ts";
import { createThreadsState } from "./threads/state.ts";
export function createState() {
  const activity = sig<Activity>("threads");
  const sidebarOpen = sig(true);
  const sidebarWidth = sig(272);
  const threads = createThreadsState();
  const settingsSection = sig<SettingsSection>("general");
  const appearance = sig<AppearanceMode>("system");
  const theme = sig("sand");
  const root = sig("");
  const providers = sig<ProviderDescription[]>([]);
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
    threads,
    settingsSection,
    appearance,
    theme,
    root,
    providers,
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
    extensions,
    settings,
    commands,
    notice,
    providerConnections,
    providerConnectionBusy,
  };
}

export type WorkbenchState = ReturnType<typeof createState>;

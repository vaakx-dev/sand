import type { AgentProvider, AgentTool } from "./agent.ts";
import type { ExtensionManifest } from "./extension.ts";
import type { JsonObject, JsonValue } from "./json.ts";
import type { WorkspaceDescription } from "./runtime.ts";

export type RuntimeCommand = (
  params: JsonValue,
  signal?: AbortSignal,
) => JsonValue | Promise<JsonValue>;

export interface SettingsApi {
  get<T extends JsonValue>(key: string, fallback: T): T;
  set(key: string, value: JsonValue): Promise<void>;
  all(): JsonObject;
}

export interface EventApi {
  emit(kind: string, payload: JsonValue): void;
  record(kind: string, payload: JsonValue): void;
  subscribe(listener: (event: HostEvent) => void | Promise<void>): () => void;
}

export interface HostEvent {
  kind: string;
  payload: JsonValue;
}

export interface HostExtensionContext {
  manifest: ExtensionManifest;
  home: string;
  workspace: WorkspaceDescription;
  settings: SettingsApi;
  events: EventApi;
  commands: {
    register(id: string, command: RuntimeCommand): void;
    execute<T = JsonValue>(id: string, params?: JsonValue, signal?: AbortSignal): Promise<T>;
  };
  providers: {
    register(provider: AgentProvider): void;
  };
  tools: {
    register(tool: AgentTool): void;
  };
}

export interface HostExtension {
  activate(
    context: HostExtensionContext,
  ): HostExtensionCleanup | void | Promise<HostExtensionCleanup | void>;
}

export type HostExtensionCleanup = () => void | Promise<void>;

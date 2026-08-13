import type { ExtensionApis } from "./apis.ts";
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
  subscribe(listener: (event: ExtensionEvent) => void | Promise<void>): () => void;
}

export interface ExtensionEvent {
  kind: string;
  payload: JsonValue;
}

export interface ExtensionContext {
  manifest: ExtensionManifest;
  root: string;
  home: string;
  workspace: WorkspaceDescription;
  settings: SettingsApi;
  events: EventApi;
  apis: ExtensionApis;
}

export interface AppExtensionContext extends ExtensionContext {
  commands: {
    register(id: string, command: RuntimeCommand): void;
    execute<T = JsonValue>(id: string, params?: JsonValue, signal?: AbortSignal): Promise<T>;
  };
}

export interface AppExtension {
  activate(
    context: AppExtensionContext,
  ): ExtensionCleanup | void | Promise<ExtensionCleanup | void>;
}

export type ExtensionCleanup = () => void | Promise<void>;

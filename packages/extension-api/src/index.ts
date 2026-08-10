import type { JsonObject, JsonValue } from "./json.ts";
import type { ThreadLifecycleSummary } from "./thread.ts";

export {
  booleanValue,
  errorMessage,
  jsonText,
  numberValue,
  objectSchema,
  objectValue,
  optionalNumber,
  optionalString,
  positiveInteger,
  requiredString,
  stringValue,
} from "./json.ts";
export type { JsonObject, JsonPrimitive, JsonValue } from "./json.ts";
export {
  canSettleThread,
  canSnoozeThread,
  compareActiveThreads,
  comparePinnedThreads,
  compareSettledThreads,
  compareSnoozedThreads,
  hasQueuedTurn,
  isThreadSettled,
  isThreadSnoozed,
  isThreadWoke,
  settledTimestamp,
  snoozeWakeLabel,
  threadLastActivityAt,
  threadRaisedHandWhileSnoozed,
  threadSection,
  threadStatus,
  threadWokeAt,
} from "./thread.ts";
export type {
  AgentSessionStatus,
  ThreadBackgroundStatus,
  ThreadChangeRequestState,
  ThreadLifecycleOptions,
  ThreadLifecycleSummary,
  ThreadSection,
  ThreadSettlementOverride,
  ThreadStatus,
} from "./thread.ts";

export type ThemeAppearance = "light" | "dark";

export interface WorkspaceFileNode {
  name: string;
  path: string;
  kind: "directory" | "file";
  children?: WorkspaceFileNode[];
}

export interface WorkspaceSearchResult {
  path: string;
  line: number;
  column: number;
  text: string;
}

export interface ThemePreview {
  canvas: string;
  sidebar: string;
  surface: string;
  text: string;
  accent: string;
}

export interface ThemeContribution {
  id: string;
  label: string;
  light?: ThemePreview;
  dark?: ThemePreview;
}

export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  main?: string;
  ui?: string;
  styles?: string[];
  themes?: ThemeContribution[];
}

export interface ExtensionDescription extends ExtensionManifest {
  root: string;
  source: "builtin" | "user" | "workspace";
  enabled: boolean;
  hostActive: boolean;
  uiActive: boolean;
  contributions: string[];
}

export interface RuntimeEvent<T = JsonValue> {
  seq: number;
  kind: string;
  payload: T;
}

export interface RuntimeClient {
  call<T = JsonValue>(method: string, params?: JsonValue): Promise<T>;
  subscribe(listener: (event: RuntimeEvent) => void): () => void;
}

export interface UiCommand {
  id: string;
  label: string;
  detail?: string;
  keybinding?: string;
  run(): void | Promise<void>;
}

export interface UiCommandRegistry {
  register(command: UiCommand): () => void;
  list(): UiCommand[];
  subscribe(listener: () => void): () => void;
  execute(id: string): Promise<void>;
}

export interface UiSlotContribution {
  id: string;
  slot: string;
  node: HTMLElement;
  order?: number;
}

export interface UiSlotRegistry {
  register(contribution: UiSlotContribution): () => void;
  mount(slot: string, container: HTMLElement): () => void;
}

export interface UiSurfaceContribution {
  id: string;
  label: string;
  description: string;
  icon: string;
  order?: number;
  multiple?: boolean;
  render?(instanceId: string): HTMLElement;
  open?(): void | Promise<void>;
}

export interface UiSurfaceRegistry {
  register(surface: UiSurfaceContribution): () => void;
  list(): UiSurfaceContribution[];
  subscribe(listener: () => void): () => void;
  open(id: string): Promise<void>;
  onOpen(listener: (surface: UiSurfaceContribution) => void): () => void;
}

export interface UiEvent<T = unknown> {
  kind: string;
  payload: T;
}

export interface UiEventRegistry {
  emit<T = unknown>(kind: string, payload: T): void;
  subscribe(listener: (event: UiEvent) => void): () => void;
}

export interface UiRegistry {
  mount(node: HTMLElement): void;
  commands: UiCommandRegistry;
  slots: UiSlotRegistry;
  surfaces: UiSurfaceRegistry;
  events: UiEventRegistry;
}

export interface UiExtensionContext {
  manifest: ExtensionManifest;
  runtime: RuntimeClient;
  ui: UiRegistry;
}

export interface UiExtension {
  activate(context: UiExtensionContext): void | Promise<void>;
}

export type AgentRole = "system" | "user" | "assistant" | "tool";

export interface AgentToolCall {
  id: string;
  name: string;
  arguments: JsonObject;
}

export interface AgentMessage {
  id: string;
  role: AgentRole;
  content: string;
  toolCalls?: AgentToolCall[];
  toolCallId?: string;
  createdAt: string;
}

export interface AgentSessionSummary extends ThreadLifecycleSummary {
  id: string;
  title: string;
  provider: string;
  model: string;
}

export interface AgentToolDefinition {
  name: string;
  description: string;
  parameters: JsonObject;
}

export interface AgentProviderRequest {
  sessionId: string;
  model: string;
  messages: AgentMessage[];
  tools: AgentToolDefinition[];
  settings: JsonObject;
  signal: AbortSignal;
  onDelta(delta: string): void;
}

export interface AgentProviderResponse {
  content: string;
  toolCalls: AgentToolCall[];
}

export interface AgentProvider {
  id: string;
  name: string;
  defaultModel?: string;
  complete(request: AgentProviderRequest): Promise<AgentProviderResponse>;
}

export interface AgentTool {
  definition: AgentToolDefinition;
  execute(input: JsonObject, signal: AbortSignal, execution?: AgentToolExecution): Promise<JsonValue>;
}

export interface AgentToolExecution {
  sessionId: string;
  callId: string;
}

export type RuntimeCommand = (params: JsonValue) => JsonValue | Promise<JsonValue>;

export interface SettingsApi {
  get<T extends JsonValue>(key: string, fallback: T): T;
  set(key: string, value: JsonValue): Promise<void>;
  all(): JsonObject;
}

export interface EventApi {
  emit(kind: string, payload: JsonValue): void;
}

export interface HostExtensionContext {
  manifest: ExtensionManifest;
  config: string;
  workspace: string;
  settings: SettingsApi;
  events: EventApi;
  commands: {
    register(id: string, command: RuntimeCommand): void;
  };
  providers: {
    register(provider: AgentProvider): void;
  };
  tools: {
    register(tool: AgentTool): void;
  };
}

export interface HostExtension {
  activate(context: HostExtensionContext): void | Promise<void>;
  deactivate?(): void | Promise<void>;
}

export interface UiBundle {
  manifest: ExtensionManifest;
  source?: string;
  styles: string[];
  fingerprint: string;
}

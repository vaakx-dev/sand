import type { JsonObject, JsonValue } from "./json.ts";
import type { ThreadLifecycleSummary } from "./thread.ts";

export type AgentRole = "system" | "user" | "assistant" | "tool";
export type AgentRunStatus = "running" | "complete" | "error" | "cancelled" | "interrupted";

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

export interface AgentThreadSummary extends ThreadLifecycleSummary {
  id: string;
  title: string;
  provider: string;
  model: string;
  activeRunId?: string;
  activeAttemptId?: string;
}

export interface AgentThread extends AgentThreadSummary {
  messages: AgentMessage[];
  runs?: AgentRun[];
  attempts?: AgentAttempt[];
}

export interface AgentRun {
  id: string;
  threadId: string;
  provider: string;
  model: string;
  status: AgentRunStatus;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface AgentAttempt {
  id: string;
  threadId: string;
  runId: string;
  provider: string;
  status: AgentRunStatus;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface OrchestrationEvent {
  sequence: number;
  id: string;
  kind: string;
  threadId?: string;
  runId?: string;
  attemptId?: string;
  createdAt: string;
  payload: JsonValue;
}

export interface AgentToolDefinition {
  name: string;
  description: string;
  parameters: JsonObject;
}

export interface AgentProviderRequest {
  threadId: string;
  runId: string;
  attemptId: string;
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

export interface AgentProviderOption {
  id: string;
  label: string;
}

export interface AgentModelTraits {
  reasoning: AgentProviderOption[];
  defaultReasoning: string;
  serviceTiers: AgentProviderOption[];
  defaultServiceTier: string;
}

export interface AgentProviderModel extends AgentModelTraits {
  slug: string;
  name: string;
  defaultFavorite?: boolean;
}

export interface AgentProviderIcon {
  viewBox: string;
  path: string;
}

export interface AgentProviderConnection {
  statusCommand: string;
  connectCommand: string;
  disconnectCommand: string;
  connectLabel: string;
  connectingLabel: string;
  disconnectLabel: string;
}

export interface AgentProviderPresentation {
  description?: string;
  icon?: AgentProviderIcon;
  connection?: AgentProviderConnection;
}

export interface AgentProviderConnectionState {
  available: boolean;
  label: string;
  description: string;
}

export interface AgentProviderDescription {
  id: string;
  name: string;
  defaultModel: string;
  modelDefaults: AgentModelTraits;
  models: AgentProviderModel[];
  presentation?: AgentProviderPresentation;
}

export function selectProviderOption(
  value: unknown,
  options: AgentProviderOption[],
  fallback: string,
): string {
  return typeof value === "string" && options.some((option) => option.id === value)
    ? value
    : options.some((option) => option.id === fallback)
      ? fallback
      : options[0]?.id ?? "";
}

export interface AgentProvider {
  id: string;
  name: string;
  defaultModel?: string;
  modelDefaults: AgentModelTraits;
  models: AgentProviderModel[];
  presentation?: AgentProviderPresentation;
  complete(request: AgentProviderRequest): Promise<AgentProviderResponse>;
}

export interface AgentTool {
  definition: AgentToolDefinition;
  execute(input: JsonObject, signal: AbortSignal, execution?: AgentToolExecution): Promise<JsonValue>;
}

export interface AgentToolExecution {
  threadId: string;
  runId: string;
  attemptId: string;
  callId: string;
}

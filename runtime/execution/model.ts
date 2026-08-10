import type {
  AgentAttempt,
  AgentAttemptReason,
  AgentMessage,
  AgentProvider,
  AgentQueuedTurn,
  AgentRun,
  AgentThread,
  JsonValue,
} from "@sand/extension-api";

import { Registry } from "../extensions/registry.ts";
import { createMessage } from "../threads/store.ts";
import { timestamp } from "../time.ts";
import type { StartRequest } from "./types.ts";

export interface ResolvedTurn extends AgentQueuedTurn {
  providerEntry: AgentProvider;
}

export function resolveTurn(
  registry: Registry,
  request: StartRequest,
  thread?: AgentThread,
  allowEmptyPrompt = false,
): ResolvedTurn {
  const prompt = allowEmptyPrompt ? request.prompt : requiredPrompt(request.prompt);
  const providerId = request.provider || thread?.provider || registry.providers.keys().next().value;
  if (!providerId) throw new Error("no agent provider is registered");
  const provider = registry.providers.get(providerId);
  if (!provider) throw new Error(`unknown provider: ${providerId}`);
  return {
    id: crypto.randomUUID(),
    prompt,
    provider: providerId,
    providerEntry: provider,
    model: request.model || thread?.model || provider.defaultModel || "default",
    createdAt: timestamp(),
  };
}

export function createRun(
  thread: AgentThread,
  turn: ResolvedTurn,
  reason: AgentAttemptReason,
): AgentRun {
  return {
    id: crypto.randomUUID(),
    threadId: thread.id,
    provider: turn.provider,
    model: turn.model,
    status: "running",
    createdAt: timestamp(),
    ...(reason === "recovery" && thread.recoverableRunId
      ? { recoveredFromRunId: thread.recoverableRunId }
      : {}),
  };
}

export function createAttempt(run: AgentRun, reason: AgentAttemptReason): AgentAttempt {
  return {
    id: crypto.randomUUID(),
    threadId: run.threadId,
    runId: run.id,
    provider: run.provider,
    status: "running",
    reason,
    createdAt: timestamp(),
  };
}

export function appendPrompt(thread: AgentThread, prompt: string): AgentMessage {
  const message = createMessage("user", prompt);
  thread.messages.push(message);
  thread.latestUserMessageAt = message.createdAt;
  return message;
}

export function queuedTurn(turn: ResolvedTurn): AgentQueuedTurn {
  const { providerEntry: _providerEntry, ...queued } = turn;
  return queued;
}

export function threadResult(
  thread: AgentThread,
  run: AgentRun,
  attempt: AgentAttempt,
): JsonValue {
  return structuredClone({ ...thread, runs: [run], attempts: [attempt] }) as unknown as JsonValue;
}

export function requiredPrompt(value: string): string {
  const prompt = value?.trim();
  if (!prompt) throw new Error("prompt is required");
  return prompt;
}

import type {
  AgentAttempt,
  AgentMessage,
  AgentQueuedTurn,
  AgentRun,
  AgentThread,
  JsonObject,
  JsonValue,
} from "@sand/extension-api";

export function lifecycleRecord(
  thread: AgentThread,
  run: AgentRun,
  attempt: AgentAttempt,
): JsonValue {
  return {
    threadId: thread.id,
    runId: run.id,
    attemptId: attempt.id,
    thread: clone(thread),
    run: clone(run),
    attempt: clone(attempt),
  };
}

export function attemptRecord(
  threadId: string,
  runId: string,
  attempt: AgentAttempt,
): JsonValue {
  return {
    threadId,
    runId,
    attemptId: attempt.id,
    attempt: clone(attempt),
  };
}

export function messageRecord(
  thread: AgentThread,
  runId: string,
  attemptId: string,
  message: AgentMessage,
): JsonValue {
  return {
    threadId: thread.id,
    runId,
    attemptId,
    thread: clone(thread),
    message: clone(message),
  };
}

export function queueRecord(
  thread: AgentThread,
  turn: AgentQueuedTurn,
): JsonValue {
  return {
    threadId: thread.id,
    thread: clone(thread),
    turn: clone(turn),
  };
}

function clone(value: object): JsonObject {
  return structuredClone(value) as unknown as JsonObject;
}

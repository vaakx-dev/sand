import type {
  AgentAttempt,
  AgentMessage,
  AgentRun,
  AgentThread,
  JsonValue,
} from "@sand/extension-api";

import { Events } from "../events.ts";
import { threadSummary } from "../threads/store.ts";

export function publishMessage(
  events: Events,
  thread: AgentThread,
  run: AgentRun,
  attempt: AgentAttempt,
  message: AgentMessage,
): void {
  events.emit("agent.message", {
    threadId: thread.id,
    runId: run.id,
    attemptId: attempt.id,
    message: message as unknown as JsonValue,
  });
}

export function publishLifecycle(
  events: Events,
  thread: AgentThread,
  run: AgentRun,
  attempt: AgentAttempt,
): void {
  events.emit("agent.status", {
    threadId: thread.id,
    runId: run.id,
    attemptId: attempt.id,
    status: thread.status,
  });
  events.emit("agent.run", {
    threadId: thread.id,
    run: run as unknown as JsonValue,
  });
  events.emit("agent.attempt", {
    threadId: thread.id,
    attempt: attempt as unknown as JsonValue,
  });
  publishThread(events, thread);
}

export function publishQueue(events: Events, thread: AgentThread): void {
  events.emit("agent.queue", {
    threadId: thread.id,
    queuedTurns: (thread.queuedTurns ?? []) as unknown as JsonValue,
  });
  publishThread(events, thread);
}

export function publishError(
  events: Events,
  threadId: string,
  runId: string,
  attemptId: string,
  message: string,
): void {
  events.emit("agent.error", { threadId, runId, attemptId, message });
}

export function publishThread(events: Events, thread: AgentThread): void {
  if (thread.listed === false) return;
  events.emit("threads.changed", { thread: threadSummary(thread) });
}

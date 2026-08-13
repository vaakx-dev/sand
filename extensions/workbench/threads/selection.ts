import { batch } from "@vaakx-dev/vrui";

import type { AgentThread, AgentThreadSummary } from "@sand/extension-api";

import type { WorkbenchState } from "../state.ts";

export function applyThread(state: WorkbenchState, thread: AgentThread): void {
  batch(() => {
    state.threads.current.set(thread.id);
    state.threads.messages.set(thread.messages);
    state.threads.runs.set(thread.runs ?? []);
    state.threads.attempts.set(thread.attempts ?? []);
    state.threads.contextUsage.set(thread.contextUsage ?? null);
    state.threads.contextOpen.set(false);
    state.threads.queue.set(thread.queuedTurns ?? []);
    state.provider.set(thread.provider);
    state.model.set(thread.model);
    state.threads.status.set(thread.status);
    state.threads.delta.set("");
  });
}

export function clearThread(state: WorkbenchState): void {
  batch(() => {
    state.threads.current.set(null);
    state.threads.messages.set([]);
    state.threads.runs.set([]);
    state.threads.attempts.set([]);
    state.threads.contextUsage.set(null);
    state.threads.contextOpen.set(false);
    state.threads.queue.set([]);
    state.threads.delta.set("");
    state.threads.status.set("idle");
  });
}

export function threadSummary({
  messages: _messages,
  runs: _runs,
  attempts: _attempts,
  ...summary
}: AgentThread): AgentThreadSummary {
  return summary;
}

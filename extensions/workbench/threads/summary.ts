import type { AgentThreadSummary } from "@sand/extension-api";

import type { ThreadsState } from "./state.ts";

export function upsertThread(state: ThreadsState, summary: AgentThreadSummary): void {
  state.items.update((threads) =>
    threads.some((thread) => thread.id === summary.id)
      ? threads.map((thread) => thread.id === summary.id ? summary : thread)
      : [summary, ...threads]
  );
}

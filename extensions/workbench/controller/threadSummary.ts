import type { AgentThreadSummary } from "@sand/extension-api";

import type { WorkbenchState } from "../state.ts";

export function upsertThread(state: WorkbenchState, summary: AgentThreadSummary): void {
  state.threads.update((threads) =>
    threads.some((thread) => thread.id === summary.id)
      ? threads.map((thread) => thread.id === summary.id ? summary : thread)
      : [summary, ...threads]
  );
}

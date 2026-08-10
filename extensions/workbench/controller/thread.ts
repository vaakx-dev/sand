import { batch } from "@vaakx-dev/vrui";

import type { WorkbenchState } from "../state.ts";

export function clearThread(state: WorkbenchState): void {
  batch(() => {
    state.threadId.set(null);
    state.messages.set([]);
    state.runs.set([]);
    state.attempts.set([]);
    state.agentDelta.set("");
    state.agentStatus.set("idle");
  });
}

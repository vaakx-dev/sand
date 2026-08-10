import { batch } from "@vaakx-dev/vrui";

import type { WorkbenchState } from "../state.ts";

export function clearSession(state: WorkbenchState): void {
  batch(() => {
    state.sessionId.set(null);
    state.messages.set([]);
    state.agentDelta.set("");
    state.agentStatus.set("idle");
  });
}

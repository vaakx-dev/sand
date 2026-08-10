import type { AgentSessionSummary } from "@sand/extension-api";

import type { WorkbenchState } from "../state.ts";

export function upsertSession(state: WorkbenchState, summary: AgentSessionSummary): void {
  state.sessions.update((sessions) =>
    sessions.some((session) => session.id === summary.id)
      ? sessions.map((session) => session.id === summary.id ? summary : session)
      : [summary, ...sessions]
  );
}

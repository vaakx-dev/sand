import { derive, sig } from "@vaakx-dev/vrui";

import type { TerminalLine, TerminalPane } from "./models.ts";

export function createTerminalState() {
  const open = sig(false);
  const opening = sig(false);
  const panes = sig<TerminalPane[]>([]);
  return {
    open,
    opening,
    visible: derive(() => open.get() && (opening.get() || panes.get().length > 0)),
    height: sig(260),
    layout: sig<"columns" | "rows">("columns"),
    panes,
    activeId: sig<string | null>(null),
    commands: sig<Record<string, string>>({}),
    ready: sig<Record<string, boolean>>({}),
    lines: sig<TerminalLine[]>([]),
    error: sig(""),
  };
}

export type TerminalState = ReturnType<typeof createTerminalState>;

import { sig } from "@vaakx-dev/vrui";

import type { TerminalLine, TerminalPane } from "./models.ts";

export function createTerminalState() {
  return {
    open: sig(false),
    height: sig(260),
    layout: sig<"columns" | "rows">("columns"),
    panes: sig<TerminalPane[]>([]),
    activeId: sig<string | null>(null),
    commands: sig<Record<string, string>>({}),
    ready: sig<Record<string, boolean>>({}),
    lines: sig<TerminalLine[]>([]),
    error: sig(""),
  };
}

export type TerminalState = ReturnType<typeof createTerminalState>;

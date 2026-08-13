import { sig } from "@vaakx-dev/vrui";

import type {
  AgentAttempt,
  AgentContextUsage,
  AgentMessage,
  AgentQueuedTurn,
  AgentRun,
  AgentThreadSummary,
} from "@sand/extension-api";

export interface ThreadMenu {
  kind: "thread" | "snooze";
  thread: AgentThreadSummary;
  x: number;
  y: number;
}

export function createThreadsState() {
  return {
    items: sig<AgentThreadSummary[]>([]),
    current: sig<string | null>(null),
    messages: sig<AgentMessage[]>([]),
    runs: sig<AgentRun[]>([]),
    attempts: sig<AgentAttempt[]>([]),
    contextUsage: sig<AgentContextUsage | null>(null),
    contextOpen: sig(false),
    queue: sig<AgentQueuedTurn[]>([]),
    prompt: sig(""),
    status: sig<AgentThreadSummary["status"]>("idle"),
    delta: sig(""),
    query: sig(""),
    preview: sig<AgentThreadSummary | null>(null),
    previewTop: sig(0),
    menu: sig<ThreadMenu | null>(null),
    rename: sig<{ id: string; title: string } | null>(null),
    renameInput: sig(""),
    settledOpen: sig(true),
    snoozedOpen: sig(false),
    settledLimit: sig(10),
    autoSettleDays: sig<number | null>(3),
  };
}

export type ThreadsState = ReturnType<typeof createThreadsState>;

import { sig } from "@vaakx-dev/vrui";

import type {
  AgentAttempt,
  AgentMessage,
  AgentQueuedTurn,
  AgentRun,
  AgentThreadSummary,
} from "@sand/extension-api";

export function createThreadsState() {
  return {
    items: sig<AgentThreadSummary[]>([]),
    current: sig<string | null>(null),
    messages: sig<AgentMessage[]>([]),
    runs: sig<AgentRun[]>([]),
    attempts: sig<AgentAttempt[]>([]),
    queue: sig<AgentQueuedTurn[]>([]),
    prompt: sig(""),
    status: sig<AgentThreadSummary["status"]>("idle"),
    delta: sig(""),
    query: sig(""),
    preview: sig<AgentThreadSummary | null>(null),
    previewTop: sig(0),
    menu: sig<{ thread: AgentThreadSummary; x: number; y: number } | null>(null),
    snoozeOpen: sig(false),
    rename: sig<{ id: string; title: string } | null>(null),
    renameInput: sig(""),
    settledOpen: sig(true),
    snoozedOpen: sig(false),
    settledLimit: sig(10),
    autoSettleDays: sig<number | null>(3),
  };
}

export type ThreadsState = ReturnType<typeof createThreadsState>;

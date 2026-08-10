import {
  comparePinnedThreads,
  type AgentMessage,
  type AgentThread,
  type JsonValue,
} from "@sand/extension-api";

import { Events } from "./events.ts";
import { timestamp } from "./time.ts";

export class ThreadStore {
  private readonly values = new Map<string, AgentThread>();

  constructor(private readonly events: Events) {}

  restore(snapshot: JsonValue): void {
    const threads = snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)
      ? snapshot.threads
      : undefined;
    if (!Array.isArray(threads)) return;
    this.values.clear();
    for (const value of threads) {
      const thread = value as unknown as AgentThread;
      if (!thread.id || !Array.isArray(thread.messages)) continue;
      normalizeThread(thread);
      this.values.set(thread.id, thread);
    }
  }

  require(id: string): AgentThread {
    const thread = this.values.get(id);
    if (!thread) throw new Error(`unknown thread: ${id}`);
    return thread;
  }

  orderedPins(): AgentThread[] {
    return [...this.values.values()].filter((thread) => thread.pinned).sort(comparePinnedThreads);
  }

  nextPinOrderKey(): string {
    const greatest = this.orderedPins().reduce((maximum, thread) => {
      const value = Number.parseInt(thread.pinOrderKey ?? "", 10);
      return Number.isFinite(value) ? Math.max(maximum, value) : maximum;
    }, -1);
    return pinKey(greatest + 1);
  }

  async reorderPin(id: string, beforeId?: string): Promise<AgentThread[]> {
    const ordered = this.orderedPins();
    const source = ordered.findIndex((thread) => thread.id === id);
    if (source < 0) throw new Error("cannot reorder an unpinned thread");
    const [thread] = ordered.splice(source, 1);
    if (!thread) return ordered;
    const target = beforeId ? ordered.findIndex((item) => item.id === beforeId) : ordered.length;
    ordered.splice(target < 0 ? ordered.length : target, 0, thread);
    const changed = ordered.filter((item, index) => item.pinOrderKey !== pinKey(index));
    for (const [index, item] of ordered.entries()) item.pinOrderKey = pinKey(index);
    await Promise.all(changed.map((item) => this.persist(item, false)));
    return changed;
  }

  create(prompt: string, provider: string, model: string): AgentThread {
    const createdAt = timestamp();
    const thread: AgentThread = {
      id: crypto.randomUUID(),
      title: prompt.length > 60 ? `${prompt.slice(0, 57)}...` : prompt,
      provider,
      model,
      status: "idle",
      pinned: false,
      unread: false,
      messages: [],
      createdAt,
      updatedAt: createdAt,
      statusChangedAt: createdAt,
    };
    this.values.set(thread.id, thread);
    return thread;
  }

  async persist(thread: AgentThread, touchUpdated = true): Promise<void> {
    if (touchUpdated) thread.updatedAt = timestamp();
    this.events.record("thread.saved", {
      threadId: thread.id,
      thread: structuredClone(thread) as unknown as JsonValue,
    });
  }

  async remove(id: string): Promise<void> {
    this.values.delete(id);
    this.events.record("thread.deleted", { threadId: id });
  }
}

export function threadSummary(thread: AgentThread): JsonValue {
  const { messages: _messages, ...summary } = thread;
  return structuredClone(summary) as unknown as JsonValue;
}

export function createMessage(role: AgentMessage["role"], content: string): AgentMessage {
  return { id: crypto.randomUUID(), role, content, createdAt: timestamp() };
}

function normalizeThread(thread: AgentThread): void {
  thread.pinned ??= false;
  thread.unread ??= false;
  thread.createdAt ||= thread.updatedAt || timestamp();
  thread.updatedAt ||= thread.createdAt;
  thread.statusChangedAt ||= thread.updatedAt;
  if (thread.pinned) {
    thread.pinnedAt ||= thread.updatedAt;
  } else {
    delete thread.pinnedAt;
    delete thread.pinOrderKey;
  }
}

function pinKey(index: number): string {
  return String(index).padStart(12, "0");
}

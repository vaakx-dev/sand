import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  comparePinnedThreads,
  errorMessage,
  type AgentMessage,
  type AgentSessionSummary,
  type JsonValue,
} from "@sand/extension-api";

export interface AgentSession extends AgentSessionSummary {
  messages: AgentMessage[];
}

export class Sessions {
  private readonly values = new Map<string, AgentSession>();
  private readonly writes = new Map<string, Promise<void>>();

  constructor(private readonly directory: string) {}

  async load(): Promise<void> {
    try {
      const files = await readdir(this.directory);
      for (const file of files.filter((path) => path.endsWith(".json"))) {
        await this.loadFile(file);
      }
      await this.normalizePinOrder();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  list(): JsonValue {
    return [...this.values.values()]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map(sessionSummary);
  }

  require(id: string): AgentSession {
    const session = this.values.get(id);
    if (!session) throw new Error(`unknown session: ${id}`);
    return session;
  }

  orderedPins(): AgentSession[] {
    return [...this.values.values()].filter((session) => session.pinned).sort(comparePinnedThreads);
  }

  nextPinOrderKey(): string {
    const greatest = this.orderedPins().reduce((maximum, session) => {
      const value = Number.parseInt(session.pinOrderKey ?? "", 10);
      return Number.isFinite(value) ? Math.max(maximum, value) : maximum;
    }, -1);
    return pinKey(greatest + 1);
  }

  async reorderPin(id: string, beforeId?: string): Promise<AgentSession[]> {
    const ordered = this.orderedPins();
    const source = ordered.findIndex((session) => session.id === id);
    if (source < 0) throw new Error("cannot reorder an unpinned thread");
    const [session] = ordered.splice(source, 1);
    if (!session) return ordered;
    const target = beforeId ? ordered.findIndex((item) => item.id === beforeId) : ordered.length;
    ordered.splice(target < 0 ? ordered.length : target, 0, session);
    const changed = ordered.filter((item, index) => item.pinOrderKey !== pinKey(index));
    for (const [index, item] of ordered.entries()) item.pinOrderKey = pinKey(index);
    await Promise.all(changed.map((item) => this.persist(item, false)));
    return changed;
  }

  create(prompt: string, provider: string, model: string): AgentSession {
    const createdAt = now();
    const session: AgentSession = {
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
    this.values.set(session.id, session);
    return session;
  }

  async persist(session: AgentSession, touchUpdated = true): Promise<void> {
    if (touchUpdated) session.updatedAt = now();
    const content = `${JSON.stringify(session, null, 2)}\n`;
    const previous = this.writes.get(session.id) ?? Promise.resolve();
    const write = previous.catch(() => {}).then(async () => {
      await mkdir(this.directory, { recursive: true });
      await writeFile(join(this.directory, `${session.id}.json`), content, "utf8");
    });
    this.writes.set(session.id, write);
    try {
      await write;
    } finally {
      if (this.writes.get(session.id) === write) this.writes.delete(session.id);
    }
  }

  async remove(id: string): Promise<void> {
    this.values.delete(id);
    await this.writes.get(id)?.catch(() => {});
    await rm(join(this.directory, `${id}.json`), { force: true });
  }

  private async loadFile(file: string): Promise<void> {
    try {
      const session = JSON.parse(
        await readFile(join(this.directory, file), "utf8"),
      ) as AgentSession;
      if (!session.id || !Array.isArray(session.messages)) return;
      normalizeSession(session);
      this.values.set(session.id, session);
    } catch (error) {
      console.error(`cannot load agent session ${file}: ${errorMessage(error)}`);
    }
  }

  private async normalizePinOrder(): Promise<void> {
    const pins = this.orderedPins();
    const changed = pins.filter((session, index) => session.pinOrderKey !== pinKey(index));
    for (const [index, session] of pins.entries()) session.pinOrderKey = pinKey(index);
    await Promise.all(changed.map((session) => this.persist(session, false)));
  }
}

export function sessionSummary(session: AgentSession): JsonValue {
  const { messages: _messages, ...summary } = session;
  return structuredClone(summary) as unknown as JsonValue;
}

export function createMessage(role: AgentMessage["role"], content: string): AgentMessage {
  return { id: crypto.randomUUID(), role, content, createdAt: now() };
}

function now(): string {
  return new Date().toISOString();
}

function normalizeSession(session: AgentSession): void {
  session.pinned ??= false;
  session.unread ??= false;
  session.createdAt ||= session.updatedAt || now();
  session.updatedAt ||= session.createdAt;
  session.statusChangedAt ||= session.updatedAt;
  if (session.pinned) {
    session.pinnedAt ||= session.updatedAt;
  } else {
    delete session.pinnedAt;
    delete session.pinOrderKey;
  }
}

function pinKey(index: number): string {
  return String(index).padStart(12, "0");
}

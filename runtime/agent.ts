import {
  canSettleThread,
  canSnoozeThread,
  errorMessage,
  isThreadSettled,
  isThreadSnoozed,
  type JsonObject,
  type JsonValue,
  type ThreadChangeRequestState,
} from "@sand/extension-api";

import { Events } from "./events.ts";
import { Registry } from "./registry.ts";
import { createMessage, Sessions, sessionSummary } from "./sessions.ts";
import { Settings } from "./settings.ts";
import { TitleGenerator } from "./title.ts";
import { AgentTurn } from "./turn.ts";

interface StartRequest {
  prompt: string;
  provider?: string;
  model?: string;
  sessionId?: string;
  maxSteps?: number;
}

export class AgentHarness {
  private readonly sessions: Sessions;
  private readonly titles: TitleGenerator;
  private readonly running = new Map<string, AbortController>();

  constructor(
    private readonly registry: Registry,
    private readonly settings: Settings,
    private readonly events: Events,
    sessionDirectory: string,
  ) {
    this.sessions = new Sessions(sessionDirectory);
    this.titles = new TitleGenerator(registry, settings, events, this.sessions);
  }

  async load(): Promise<void> {
    await this.sessions.load();
  }

  providers(): JsonValue {
    return [...this.registry.providers.values()].map((provider) => ({
      id: provider.id,
      name: provider.name,
      defaultModel: provider.defaultModel ?? "",
    }));
  }

  tools(): JsonValue {
    return [...this.registry.tools.values()].map((tool) => tool.definition) as unknown as JsonValue;
  }

  async tool(name: string, input: JsonObject): Promise<JsonValue> {
    const tool = this.registry.tools.get(name);
    if (!tool) throw new Error(`unknown tool: ${name}`);
    return tool.execute(input, new AbortController().signal);
  }

  sessionsList(): JsonValue {
    return this.sessions.list();
  }

  session(id: string): JsonValue {
    const session = this.sessions.require(id);
    return structuredClone(session) as unknown as JsonValue;
  }

  async start(request: StartRequest): Promise<JsonValue> {
    const prompt = request.prompt?.trim();
    if (!prompt) throw new Error("prompt is required");
    const providerId = request.provider || "echo";
    const provider = this.registry.providers.get(providerId);
    if (!provider) throw new Error(`unknown provider: ${providerId}`);
    const model = request.model || provider.defaultModel || "default";

    const firstMessage = !request.sessionId;
    const session = request.sessionId
      ? this.sessions.require(request.sessionId)
      : this.sessions.create(prompt, providerId, model);
    if (this.running.has(session.id)) throw new Error("session is already running");

    const startedAt = timestamp();
    session.provider = providerId;
    session.model = model;
    session.status = "running";
    session.statusChangedAt = startedAt;
    session.latestTurnStartedAt = startedAt;
    session.settledOverride = undefined;
    session.settledAt = undefined;
    session.snoozedAt = undefined;
    session.snoozedUntil = undefined;
    session.wakeAcknowledgedAt = startedAt;
    session.lastVisitedAt = startedAt;
    session.unread = false;
    const message = createMessage("user", prompt);
    session.messages.push(message);
    session.latestUserMessageAt = message.createdAt;
    await this.sessions.persist(session);

    const controller = new AbortController();
    this.running.set(session.id, controller);
    this.events.emit("agent.message", {
      sessionId: session.id,
      message: session.messages.at(-1) as unknown as JsonValue,
    });
    this.events.emit("agent.status", { sessionId: session.id, status: "running" });
    this.events.emit("agent.session", { session: sessionSummary(session) });

    if (firstMessage) {
      void this.titles.generate(session, prompt, controller.signal).catch(() => {});
    }

    const turn = new AgentTurn(
      this.registry,
      this.settings,
      this.events,
      this.sessions,
      session,
      provider,
      controller.signal,
      request.maxSteps ?? 50,
    );
    void turn.run()
      .catch(async (error) => {
        session.status = controller.signal.aborted ? "cancelled" : "error";
        session.statusChangedAt = timestamp();
        session.latestTurnCompletedAt = session.statusChangedAt;
        session.unread = true;
        this.events.emit("agent.error", {
          sessionId: session.id,
          message: errorMessage(error),
        });
        this.events.emit("agent.status", { sessionId: session.id, status: session.status });
        await this.sessions.persist(session);
        this.events.emit("agent.session", { session: sessionSummary(session) });
      })
      .finally(() => this.running.delete(session.id));

    return structuredClone(session) as unknown as JsonValue;
  }

  cancel(sessionId: string): JsonValue {
    const controller = this.running.get(sessionId);
    if (!controller) return false;
    controller.abort();
    return true;
  }

  async pin(sessionId: string, pinned: boolean): Promise<JsonValue> {
    const session = this.sessions.require(sessionId);
    const now = timestamp();
    if (pinned) {
      const orderKey = session.pinOrderKey ?? this.sessions.nextPinOrderKey();
      if (isThreadSnoozed(session, Date.parse(now))) {
        session.snoozedAt = undefined;
        session.snoozedUntil = undefined;
        session.wakeAcknowledgedAt = now;
      }
      if (isThreadSettled(session, this.lifecycleOptions(now))) {
        session.settledOverride = "active";
        session.settledAt = undefined;
      }
      session.pinned = true;
      session.pinnedAt ||= now;
      session.pinOrderKey = orderKey;
    } else {
      session.pinned = false;
      session.pinnedAt = undefined;
      session.pinOrderKey = undefined;
    }
    return this.persistAndPublish(session);
  }

  async settle(sessionId: string, settled: boolean): Promise<JsonValue> {
    const session = this.sessions.require(sessionId);
    const now = timestamp();
    if (settled && !canSettleThread(session, Date.parse(now))) {
      throw new Error("cannot settle a thread with active or pending work");
    }
    session.settledOverride = settled ? "settled" : "active";
    session.settledAt = settled ? now : undefined;
    if (settled) {
      session.pinned = false;
      session.pinnedAt = undefined;
      session.pinOrderKey = undefined;
      session.snoozedAt = undefined;
      session.snoozedUntil = undefined;
      session.wakeAcknowledgedAt = now;
    }
    return this.persistAndPublish(session);
  }

  async rename(sessionId: string, title: string): Promise<JsonValue> {
    const session = this.sessions.require(sessionId);
    const clean = title.trim();
    if (!clean) throw new Error("thread title is required");
    session.title = clean.slice(0, 120);
    await this.sessions.persist(session, false);
    return this.publish(session);
  }

  async unread(sessionId: string, unread: boolean): Promise<JsonValue> {
    const session = this.sessions.require(sessionId);
    session.unread = unread;
    await this.sessions.persist(session, false);
    return this.publish(session);
  }

  async snooze(sessionId: string, until: string | undefined): Promise<JsonValue> {
    const session = this.sessions.require(sessionId);
    const now = timestamp();
    if (!canSnoozeThread(session, Date.parse(now))) {
      throw new Error("cannot snooze a thread waiting for attention");
    }
    if (until) {
      const wakeAt = Date.parse(until);
      if (!Number.isFinite(wakeAt) || wakeAt <= Date.parse(now)) {
        throw new Error("snooze time must be in the future");
      }
      session.snoozedAt = now;
      session.snoozedUntil = until;
      session.wakeAcknowledgedAt = now;
    } else {
      session.snoozedAt = undefined;
      session.snoozedUntil = undefined;
      session.wakeAcknowledgedAt = now;
    }
    return this.persistAndPublish(session);
  }

  async visit(sessionId: string): Promise<JsonValue> {
    const session = this.sessions.require(sessionId);
    const now = timestamp();
    session.lastVisitedAt = now;
    session.wakeAcknowledgedAt = now;
    session.unread = false;
    await this.sessions.persist(session, false);
    return this.publish(session);
  }

  async reorderPin(sessionId: string, beforeId?: string): Promise<JsonValue> {
    const changed = await this.sessions.reorderPin(sessionId, beforeId);
    const summaries = changed.map((session) => sessionSummary(session));
    for (const summary of summaries) this.events.emit("agent.session", { session: summary });
    return summaries;
  }

  async changeRequest(
    sessionId: string,
    state: ThreadChangeRequestState | undefined,
  ): Promise<JsonValue> {
    const session = this.sessions.require(sessionId);
    if (session.changeRequestState === state) return sessionSummary(session);
    session.changeRequestChangedAt = timestamp();
    session.changeRequestState = state;
    return this.persistAndPublish(session);
  }

  async delete(sessionId: string): Promise<JsonValue> {
    const session = this.sessions.require(sessionId);
    if (session.status === "running") throw new Error("cannot delete a running session");
    await this.sessions.remove(sessionId);
    this.events.emit("agent.session_deleted", { sessionId });
    return true;
  }

  private publish(session: ReturnType<Sessions["require"]>): JsonValue {
    const summary = sessionSummary(session);
    this.events.emit("agent.session", { session: summary });
    return summary;
  }

  private async persistAndPublish(session: ReturnType<Sessions["require"]>): Promise<JsonValue> {
    await this.sessions.persist(session, false);
    return this.publish(session);
  }

  private lifecycleOptions(now: string): { now: number; autoSettleAfterDays: number | null } {
    const configured = this.settings.get<JsonValue>("workbench.autoSettleDays", 3);
    return {
      now: Date.parse(now),
      autoSettleAfterDays: typeof configured === "number" && configured >= 0
        ? configured
        : null,
    };
  }
}

function timestamp(): string {
  return new Date().toISOString();
}

import {
  canSettleThread,
  canSnoozeThread,
  isThreadSettled,
  isThreadSnoozed,
  type JsonValue,
  type ThreadChangeRequestState,
} from "@sand/extension-api";

import { Events } from "../events.ts";
import { Settings } from "../settings.ts";
import { timestamp } from "../time.ts";
import { ThreadStore, threadSummary } from "./store.ts";

export class ThreadLifecycle {
  constructor(
    private readonly threads: ThreadStore,
    private readonly settings: Settings,
    private readonly events: Events,
  ) {}

  async pin(threadId: string, pinned: boolean): Promise<JsonValue> {
    const thread = this.threads.require(threadId);
    const now = timestamp();
    if (pinned) {
      const orderKey = thread.pinOrderKey ?? this.threads.nextPinOrderKey();
      if (isThreadSnoozed(thread, Date.parse(now))) {
        thread.snoozedAt = undefined;
        thread.snoozedUntil = undefined;
        thread.wakeAcknowledgedAt = now;
      }
      if (isThreadSettled(thread, this.options(now))) {
        thread.settledOverride = "active";
        thread.settledAt = undefined;
      }
      thread.pinned = true;
      thread.pinnedAt ||= now;
      thread.pinOrderKey = orderKey;
    } else {
      thread.pinned = false;
      thread.pinnedAt = undefined;
      thread.pinOrderKey = undefined;
    }
    return this.persist(thread);
  }

  async settle(threadId: string, settled: boolean): Promise<JsonValue> {
    const thread = this.threads.require(threadId);
    const now = timestamp();
    if (settled && !canSettleThread(thread, Date.parse(now))) {
      throw new Error("cannot settle a thread with active or pending work");
    }
    thread.settledOverride = settled ? "settled" : "active";
    thread.settledAt = settled ? now : undefined;
    if (settled) {
      thread.pinned = false;
      thread.pinnedAt = undefined;
      thread.pinOrderKey = undefined;
      thread.snoozedAt = undefined;
      thread.snoozedUntil = undefined;
      thread.wakeAcknowledgedAt = now;
    }
    return this.persist(thread);
  }

  async rename(threadId: string, title: string): Promise<JsonValue> {
    const thread = this.threads.require(threadId);
    const clean = title.trim();
    if (!clean) throw new Error("thread title is required");
    thread.title = clean.slice(0, 120);
    return this.persist(thread);
  }

  async unread(threadId: string, unread: boolean): Promise<JsonValue> {
    const thread = this.threads.require(threadId);
    thread.unread = unread;
    return this.persist(thread);
  }

  async snooze(threadId: string, until: string | undefined): Promise<JsonValue> {
    const thread = this.threads.require(threadId);
    const now = timestamp();
    if (!canSnoozeThread(thread, Date.parse(now))) {
      throw new Error("cannot snooze a thread waiting for attention");
    }
    if (until) {
      const wakeAt = Date.parse(until);
      if (!Number.isFinite(wakeAt) || wakeAt <= Date.parse(now)) {
        throw new Error("snooze time must be in the future");
      }
      thread.snoozedAt = now;
      thread.snoozedUntil = until;
      thread.wakeAcknowledgedAt = now;
    } else {
      thread.snoozedAt = undefined;
      thread.snoozedUntil = undefined;
      thread.wakeAcknowledgedAt = now;
    }
    return this.persist(thread);
  }

  async visit(threadId: string): Promise<JsonValue> {
    const thread = this.threads.require(threadId);
    const now = timestamp();
    thread.lastVisitedAt = now;
    thread.wakeAcknowledgedAt = now;
    thread.unread = false;
    return this.persist(thread);
  }

  async reorderPin(threadId: string, beforeId?: string): Promise<JsonValue> {
    const changed = await this.threads.reorderPin(threadId, beforeId);
    const summaries = changed.map((thread) => threadSummary(thread));
    for (const summary of summaries) {
      this.events.emit("threads.changed", { thread: summary });
    }
    return summaries;
  }

  async changeRequest(
    threadId: string,
    state: ThreadChangeRequestState | undefined,
  ): Promise<JsonValue> {
    const thread = this.threads.require(threadId);
    if (thread.changeRequestState === state) return threadSummary(thread);
    thread.changeRequestChangedAt = timestamp();
    thread.changeRequestState = state;
    return this.persist(thread);
  }

  async delete(threadId: string): Promise<JsonValue> {
    const thread = this.threads.require(threadId);
    if (thread.status === "running") throw new Error("cannot delete a running thread");
    await this.threads.remove(threadId);
    this.events.emit("threads.deleted", { threadId });
    return true;
  }

  private async persist(thread: ReturnType<ThreadStore["require"]>): Promise<JsonValue> {
    await this.threads.persist(thread, false);
    const summary = threadSummary(thread);
    this.events.emit("threads.changed", { thread: summary });
    return summary;
  }

  private options(now: string): { now: number; autoSettleAfterDays: number | null } {
    const configured = this.settings.get<JsonValue>("workbench.autoSettleDays", 3);
    return {
      now: Date.parse(now),
      autoSettleAfterDays: typeof configured === "number" && configured >= 0
        ? configured
        : null,
    };
  }
}

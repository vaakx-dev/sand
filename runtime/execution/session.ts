import {
  errorMessage,
  type AgentAttempt,
  type AgentAttemptReason,
  type AgentRun,
  type AgentThread,
  type JsonValue,
} from "@sand/extension-api";

import { Events } from "../events.ts";
import { Registry } from "../extensions/registry.ts";
import { Settings } from "../settings.ts";
import { createMessage, ThreadStore } from "../threads/store.ts";
import { timestamp } from "../time.ts";
import { AgentTurn } from "./turn.ts";
import { repairInterruptedTools } from "./history.ts";
import {
  appendPrompt,
  createAttempt,
  createRun,
  threadResult,
  type ResolvedTurn,
} from "./model.ts";
import {
  publishError,
  publishLifecycle,
  publishMessage,
} from "./publish.ts";
import {
  attemptRecord,
  lifecycleRecord,
  messageRecord,
} from "./records.ts";
import type { RunFinalStatus } from "./types.ts";

type FinishHandler = (session: RunSession, status: RunFinalStatus) => void | Promise<void>;

export class RunSession {
  readonly run: AgentRun;
  private attempt: AgentAttempt;
  private controller = new AbortController();
  private token = 1;
  private state: "running" | "cancelling" | "closing" = "running";

  constructor(
    private readonly registry: Registry,
    private readonly settings: Settings,
    private readonly events: Events,
    private readonly threads: ThreadStore,
    readonly thread: AgentThread,
    private readonly turn: ResolvedTurn,
    private readonly reason: AgentAttemptReason,
    private readonly onFinish: FinishHandler,
  ) {
    this.run = createRun(thread, turn, reason);
    this.attempt = createAttempt(this.run, reason);
  }

  start(): void {
    this.prepareThread();
    const repaired = repairInterruptedTools(this.thread);
    const messages = this.reason === "recovery"
      ? repaired
      : [...repaired, appendPrompt(this.thread, this.turn.prompt)];
    this.threads.touch(this.thread);
    this.events.record(
      this.reason === "recovery" ? "run.recovered" : "run.started",
      lifecycleRecord(this.thread, this.run, this.attempt),
    );
    for (const message of messages) {
      this.events.record(
        "message.appended",
        messageRecord(this.thread, this.run.id, this.attempt.id, message),
      );
      publishMessage(this.events, this.thread, this.run, this.attempt, message);
    }
    publishLifecycle(this.events, this.thread, this.run, this.attempt);
    this.launch(this.token);
  }

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  steer(prompt: string): JsonValue {
    if (this.state !== "running") throw new Error("thread has no steerable run");
    const completedAt = timestamp();
    const previous = this.attempt;
    const interrupted = this.controller;
    Object.assign(previous, {
      status: "interrupted" as const,
      completedAt,
      stopReason: "steered" as const,
    });

    const message = createMessage("user", prompt);
    this.attempt = createAttempt(this.run, "steer");
    this.controller = new AbortController();
    this.token += 1;
    this.thread.messages.push(message);
    this.thread.latestUserMessageAt = message.createdAt;
    this.thread.latestTurnStartedAt = this.attempt.createdAt;
    this.thread.activeAttemptId = this.attempt.id;
    this.thread.status = "running";
    this.thread.statusChangedAt = this.attempt.createdAt;
    this.threads.touch(this.thread);

    this.events.record("attempt.steered", attemptRecord(this.thread.id, this.run.id, previous));
    this.events.record(
      "attempt.started",
      lifecycleRecord(this.thread, this.run, this.attempt),
    );
    this.events.record(
      "message.appended",
      messageRecord(this.thread, this.run.id, this.attempt.id, message),
    );
    interrupted.abort("steered");
    this.events.emit("agent.delta.reset", { threadId: this.thread.id });
    publishMessage(this.events, this.thread, this.run, this.attempt, message);
    publishLifecycle(this.events, this.thread, this.run, this.attempt);
    this.launch(this.token);
    return this.result();
  }

  cancel(): boolean {
    if (this.state !== "running") return false;
    this.state = "cancelling";
    this.events.record(
      "run.cancelRequested",
      lifecycleRecord(this.thread, this.run, this.attempt),
    );
    this.controller.abort("cancelled");
    return true;
  }

  result(): JsonValue {
    return threadResult(this.thread, this.run, this.attempt);
  }

  private prepareThread(): void {
    const startedAt = this.run.createdAt;
    Object.assign(this.thread, {
      provider: this.turn.provider,
      model: this.turn.model,
      status: "running" as const,
      statusChangedAt: startedAt,
      latestTurnStartedAt: startedAt,
      wakeAcknowledgedAt: startedAt,
      lastVisitedAt: startedAt,
      unread: false,
      activeRunId: this.run.id,
      activeAttemptId: this.attempt.id,
    });
    this.thread.settledOverride = undefined;
    this.thread.settledAt = undefined;
    this.thread.snoozedAt = undefined;
    this.thread.snoozedUntil = undefined;
    this.thread.recoverableRunId = undefined;
    this.thread.recoverableAttemptId = undefined;
  }

  private launch(token: number): void {
    const turn = new AgentTurn(
      this.registry,
      this.settings,
      this.events,
      this.threads,
      this.thread,
      this.turn.providerEntry,
      this.controller.signal,
      this.run.id,
      this.attempt.id,
    );
    void turn.run()
      .then(() => this.finish(token, "complete"))
      .catch((error) => this.fail(token, error));
  }

  private async fail(token: number, error: unknown): Promise<void> {
    if (!this.isCurrent(token)) return;
    if (this.controller.signal.aborted) {
      await this.finish(token, "cancelled");
      return;
    }
    await this.finish(token, "error", errorMessage(error));
  }

  private async finish(token: number, status: RunFinalStatus, error?: string): Promise<void> {
    if (!this.isCurrent(token)) return;
    this.state = "closing";
    const completedAt = timestamp();
    Object.assign(this.run, { status, completedAt, ...(error ? { error } : {}) });
    Object.assign(this.attempt, {
      status,
      completedAt,
      ...(status === "cancelled" ? { stopReason: "cancelled" as const } : {}),
      ...(error ? { error } : {}),
    });
    Object.assign(this.thread, {
      status,
      statusChangedAt: completedAt,
      latestTurnCompletedAt: completedAt,
      unread: true,
    });
    this.thread.activeRunId = undefined;
    this.thread.activeAttemptId = undefined;
    this.threads.touch(this.thread);
    this.events.record(`run.${status}`, lifecycleRecord(this.thread, this.run, this.attempt));
    publishLifecycle(this.events, this.thread, this.run, this.attempt);
    if (error) {
      publishError(
        this.events,
        this.thread.id,
        this.run.id,
        this.attempt.id,
        error,
      );
    }
    await this.onFinish(this, status);
  }

  private isCurrent(token: number): boolean {
    return token === this.token && this.state !== "closing";
  }
}

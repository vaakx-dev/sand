import type { AgentThread, JsonValue } from "@sand/extension-api";

import { Events } from "../events.ts";
import { Registry } from "../extensions/registry.ts";
import { Settings } from "../settings.ts";
import { ThreadStore, threadSummary } from "../threads/store.ts";
import { TitleGenerator } from "../threads/title.ts";
import {
  queuedTurn,
  requiredPrompt,
  resolveTurn,
  type ResolvedTurn,
} from "./model.ts";
import { publishQueue } from "./publish.ts";
import { queueRecord } from "./records.ts";
import { RunSession } from "./session.ts";
import type {
  QueueRequest,
  RunFinishListener,
  RunFinalStatus,
  StartRequest,
  SteerRequest,
} from "./types.ts";

export class ExecutionCoordinator {
  private readonly active = new Map<string, RunSession>();
  private readonly finishListeners = new Set<RunFinishListener>();

  constructor(
    private readonly registry: Registry,
    private readonly settings: Settings,
    private readonly events: Events,
    private readonly threads: ThreadStore,
    private readonly titles: TitleGenerator,
  ) {}

  start(request: StartRequest): JsonValue {
    const prompt = requiredPrompt(request.prompt);
    const existing = request.threadId ? this.threads.require(request.threadId) : undefined;
    if (existing && this.active.has(existing.id)) {
      throw new Error("thread is already running; queue or steer the prompt instead");
    }
    const turn = resolveTurn(this.registry, { ...request, prompt }, existing);
    const thread = existing ?? this.threads.create(prompt, turn.provider, turn.model);
    const session = this.begin(thread, turn, "start");
    if (!existing) {
      void this.titles.generate(thread, prompt, session.signal).catch(() => {});
    }
    return session.result();
  }

  queue(request: QueueRequest): JsonValue {
    const thread = this.threads.require(request.threadId);
    if (!this.active.has(thread.id)) return this.start(request);
    const turn = resolveTurn(
      this.registry,
      { ...request, prompt: requiredPrompt(request.prompt) },
      thread,
    );
    const queued = queuedTurn(turn);
    thread.queuedTurns ??= [];
    thread.queuedTurns.push(queued);
    this.threads.touch(thread);
    this.events.record("turn.queued", queueRecord(thread, queued));
    publishQueue(this.events, thread);
    return threadSummary(thread);
  }

  steer(request: SteerRequest): JsonValue {
    const session = this.requireActive(request.threadId);
    return session.steer(requiredPrompt(request.prompt));
  }

  cancel(threadId: string): JsonValue {
    return this.active.get(threadId)?.cancel() ?? false;
  }

  recover(threadId: string): JsonValue {
    const thread = this.threads.require(threadId);
    if (this.active.has(thread.id)) throw new Error("thread is already running");
    if (thread.status !== "interrupted") throw new Error("only interrupted threads can be recovered");
    if (!thread.messages.length) throw new Error("thread has no conversation to recover");
    const turn = resolveTurn(this.registry, {
      prompt: "",
      provider: thread.provider,
      model: thread.model,
      threadId: thread.id,
    }, thread, true);
    return this.begin(thread, turn, "recovery").result();
  }

  onFinish(listener: RunFinishListener): () => void {
    this.finishListeners.add(listener);
    return () => this.finishListeners.delete(listener);
  }

  async shutdown(): Promise<void> {
    if (this.active.size === 0) return;
    await new Promise<void>((resolve) => {
      let unsubscribe = () => {};
      unsubscribe = this.onFinish(() => {
        if (this.active.size !== 0) return;
        unsubscribe();
        resolve();
      });
      for (const session of this.active.values()) session.cancel();
      if (this.active.size === 0) {
        unsubscribe();
        resolve();
      }
    });
  }

  private begin(
    thread: AgentThread,
    turn: ResolvedTurn,
    reason: "start" | "recovery",
  ): RunSession {
    const session = new RunSession(
      this.registry,
      this.settings,
      this.events,
      this.threads,
      thread,
      turn,
      reason,
      (completed, status) => this.finish(completed, status),
    );
    this.active.set(thread.id, session);
    session.start();
    return session;
  }

  private async finish(session: RunSession, status: RunFinalStatus): Promise<void> {
    if (this.active.get(session.thread.id) !== session) return;
    this.active.delete(session.thread.id);
    await Promise.allSettled(
      [...this.finishListeners].map((listener) =>
        listener(session.thread.id, status, session.run.error)
      ),
    );
    if (status === "complete") await this.drain(session.thread);
  }

  private async drain(thread: AgentThread): Promise<void> {
    const queued = thread.queuedTurns?.[0];
    if (!queued || this.active.has(thread.id)) return;
    const turn = resolveTurn(this.registry, { ...queued, threadId: thread.id }, thread);
    thread.queuedTurns = thread.queuedTurns?.slice(1) ?? [];
    this.threads.touch(thread);
    this.begin(thread, turn, "start");
    this.events.record("turn.dequeued", queueRecord(thread, queued));
    publishQueue(this.events, thread);
  }

  private requireActive(threadId: string): RunSession {
    this.threads.require(threadId);
    const session = this.active.get(threadId);
    if (!session) throw new Error("thread has no active run");
    return session;
  }
}

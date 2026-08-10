import {
  errorMessage,
  type AgentAttempt,
  type AgentRun,
  type AgentRunStatus,
  type JsonObject,
  type JsonValue,
} from "@sand/extension-api";

import { Events } from "./events.ts";
import { Registry } from "./registry.ts";
import { createMessage, ThreadStore, threadSummary } from "./threadStore.ts";
import { ThreadLifecycle } from "./lifecycle.ts";
import { Settings } from "./settings.ts";
import { timestamp } from "./time.ts";
import { TitleGenerator } from "./title.ts";
import { AgentTurn } from "./turn.ts";

interface StartRequest {
  prompt: string;
  provider?: string;
  model?: string;
  threadId?: string;
  maxSteps?: number;
}

interface ActiveRun {
  controller: AbortController;
  run: AgentRun;
  attempt: AgentAttempt;
}

export class AgentHarness {
  private readonly threads: ThreadStore;
  private readonly titles: TitleGenerator;
  private readonly running = new Map<string, ActiveRun>();
  readonly lifecycle: ThreadLifecycle;

  constructor(
    private readonly registry: Registry,
    private readonly settings: Settings,
    private readonly events: Events,
  ) {
    this.threads = new ThreadStore(events);
    this.titles = new TitleGenerator(registry, settings, events, this.threads);
    this.lifecycle = new ThreadLifecycle(this.threads, settings, events);
  }

  restore(snapshot: JsonValue): void {
    this.threads.restore(snapshot);
  }

  providers(): JsonValue {
    return [...this.registry.providers.values()].map((provider) => ({
      id: provider.id,
      name: provider.name,
      defaultModel: provider.defaultModel ?? "",
      modelDefaults: provider.modelDefaults,
      models: provider.models,
      presentation: provider.presentation,
    })) as unknown as JsonValue;
  }

  tools(): JsonValue {
    return [...this.registry.tools.values()].map((tool) => tool.definition) as unknown as JsonValue;
  }

  async tool(name: string, input: JsonObject): Promise<JsonValue> {
    const tool = this.registry.tools.get(name);
    if (!tool) throw new Error(`unknown tool: ${name}`);
    return tool.execute(input, new AbortController().signal);
  }

  async start(request: StartRequest): Promise<JsonValue> {
    const prompt = request.prompt?.trim();
    if (!prompt) throw new Error("prompt is required");
    const providerId = request.provider || this.registry.providers.keys().next().value;
    if (!providerId) throw new Error("no agent provider is registered");
    const provider = this.registry.providers.get(providerId);
    if (!provider) throw new Error(`unknown provider: ${providerId}`);
    const model = request.model || provider.defaultModel || "default";

    const firstMessage = !request.threadId;
    const thread = request.threadId
      ? this.threads.require(request.threadId)
      : this.threads.create(prompt, providerId, model);
    if (this.running.has(thread.id)) throw new Error("thread is already running");

    const startedAt = timestamp();
    const run: AgentRun = {
      id: crypto.randomUUID(),
      threadId: thread.id,
      provider: providerId,
      model,
      status: "running",
      createdAt: startedAt,
    };
    const attempt: AgentAttempt = {
      id: crypto.randomUUID(),
      threadId: thread.id,
      runId: run.id,
      provider: providerId,
      status: "running",
      createdAt: startedAt,
    };
    thread.provider = providerId;
    thread.model = model;
    thread.status = "running";
    thread.statusChangedAt = startedAt;
    thread.latestTurnStartedAt = startedAt;
    thread.settledOverride = undefined;
    thread.settledAt = undefined;
    thread.snoozedAt = undefined;
    thread.snoozedUntil = undefined;
    thread.wakeAcknowledgedAt = startedAt;
    thread.lastVisitedAt = startedAt;
    thread.unread = false;
    thread.activeRunId = run.id;
    thread.activeAttemptId = attempt.id;
    const message = createMessage("user", prompt);
    thread.messages.push(message);
    thread.latestUserMessageAt = message.createdAt;
    this.events.record("run.started", lifecycleRecord(thread, run, attempt));
    this.events.record("message.appended", messageRecord(thread.id, run.id, attempt.id, message));
    await this.threads.persist(thread);

    const controller = new AbortController();
    this.running.set(thread.id, { controller, run, attempt });
    this.events.emit("orchestration.message", {
      threadId: thread.id,
      runId: run.id,
      attemptId: attempt.id,
      message: thread.messages.at(-1) as unknown as JsonValue,
    });
    this.publishLifecycle(thread, run, attempt);

    if (firstMessage) {
      void this.titles.generate(thread, prompt, controller.signal).catch(() => {});
    }

    const turn = new AgentTurn(
      this.registry,
      this.settings,
      this.events,
      this.threads,
      thread,
      provider,
      controller.signal,
      request.maxSteps ?? 50,
      run.id,
      attempt.id,
    );
    void turn.run()
      .then(() => this.finish(thread, run, attempt, "complete"))
      .catch(async (error) => {
        const cancelled = controller.signal.aborted;
        await this.finish(
          thread,
          run,
          attempt,
          cancelled ? "cancelled" : "error",
          cancelled ? undefined : errorMessage(error),
        );
      })
      .finally(() => this.running.delete(thread.id));

    return structuredClone({ ...thread, runs: [run], attempts: [attempt] }) as unknown as JsonValue;
  }

  cancel(threadId: string): JsonValue {
    const active = this.running.get(threadId);
    if (!active) return false;
    active.controller.abort();
    return true;
  }

  private async finish(
    thread: ReturnType<ThreadStore["require"]>,
    run: AgentRun,
    attempt: AgentAttempt,
    status: Exclude<AgentRunStatus, "running" | "interrupted">,
    error?: string,
  ): Promise<void> {
    const completedAt = timestamp();
    Object.assign(run, { status, completedAt, ...(error ? { error } : {}) });
    Object.assign(attempt, { status, completedAt, ...(error ? { error } : {}) });
    thread.status = status;
    thread.statusChangedAt = completedAt;
    thread.latestTurnCompletedAt = completedAt;
    thread.unread = true;
    thread.activeRunId = undefined;
    thread.activeAttemptId = undefined;
    this.events.record(`run.${status}`, lifecycleRecord(thread, run, attempt));
    await this.threads.persist(thread);
    this.publishLifecycle(thread, run, attempt);
    if (error) {
      this.events.emit("orchestration.error", {
        threadId: thread.id,
        runId: run.id,
        attemptId: attempt.id,
        message: error,
      });
    }
  }

  private publishLifecycle(
    thread: ReturnType<ThreadStore["require"]>,
    run: AgentRun,
    attempt: AgentAttempt,
  ): void {
    this.events.emit("orchestration.status", {
      threadId: thread.id,
      runId: run.id,
      attemptId: attempt.id,
      status: thread.status,
    });
    this.events.emit("orchestration.run", {
      threadId: thread.id,
      run: run as unknown as JsonValue,
    });
    this.events.emit("orchestration.attempt", {
      threadId: thread.id,
      attempt: attempt as unknown as JsonValue,
    });
    this.events.emit("orchestration.thread", { thread: threadSummary(thread) });
  }

}

function lifecycleRecord(
  thread: ReturnType<ThreadStore["require"]>,
  run: AgentRun,
  attempt: AgentAttempt,
): JsonValue {
  return {
    threadId: thread.id,
    runId: run.id,
    attemptId: attempt.id,
    thread: structuredClone(thread) as unknown as JsonValue,
    run: structuredClone(run) as unknown as JsonValue,
    attempt: structuredClone(attempt) as unknown as JsonValue,
  };
}

function messageRecord(
  threadId: string,
  runId: string,
  attemptId: string,
  message: ReturnType<typeof createMessage>,
): JsonValue {
  return {
    threadId,
    runId,
    attemptId,
    message: message as unknown as JsonValue,
  };
}

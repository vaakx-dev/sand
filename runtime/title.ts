import {
  errorMessage,
  objectValue,
  selectProviderOption,
  stringValue,
  type AgentThread,
  type JsonObject,
} from "@sand/extension-api";

import { Events } from "./events.ts";
import { Registry } from "./registry.ts";
import { createMessage, ThreadStore, threadSummary } from "./threadStore.ts";
import { Settings } from "./settings.ts";

const TITLE_PROMPT = "Create a concise thread title from the user's first message. Return only the title, with no quotation marks, markdown, explanation, or ending punctuation. Use at most eight words.";

export class TitleGenerator {
  constructor(
    private readonly registry: Registry,
    private readonly settings: Settings,
    private readonly events: Events,
    private readonly threads: ThreadStore,
  ) {}

  async generate(thread: AgentThread, prompt: string, signal: AbortSignal): Promise<void> {
    const runId = crypto.randomUUID();
    const attemptId = crypto.randomUUID();
    const selected = objectValue(this.settings.get<JsonObject>("agent.titleGeneration", {}));
    const provider = this.registry.providers.get(stringValue(selected.provider))
      ?? this.registry.providers.values().next().value;
    if (!provider) return;
    const model = stringValue(selected.model, provider.defaultModel || "default");
    const modelTraits = provider.models.find((item) => item.slug === model)
      ?? provider.modelDefaults;
    const reasoning = selectProviderOption(
      selected.reasoning,
      modelTraits.reasoning,
      modelTraits.defaultReasoning,
    );
    const serviceTier = selectProviderOption(
      undefined,
      modelTraits.serviceTiers,
      modelTraits.defaultServiceTier,
    );
    const providerSettings = {
      ...this.settings.get<JsonObject>(`provider.${provider.id}`, {}),
      reasoning,
      serviceTier,
    };
    this.events.record("title.started", {
      threadId: thread.id,
      runId,
      attemptId,
      provider: provider.id,
      model,
    });
    const response = await provider.complete({
      threadId: thread.id,
      runId,
      attemptId,
      model,
      messages: [
        createMessage("system", TITLE_PROMPT),
        createMessage("user", prompt),
      ],
      tools: [],
      settings: providerSettings,
      signal,
      onDelta() {},
    }).catch((error) => {
      this.events.record("title.failed", {
        threadId: thread.id,
        runId,
        attemptId,
        error: errorMessage(error),
      });
      throw error;
    });
    const title = cleanTitle(response.content);
    if (!title || signal.aborted) return;
    thread.title = title;
    await this.threads.persist(thread, false);
    this.events.record("title.completed", {
      threadId: thread.id,
      runId,
      attemptId,
      title,
    });
    this.events.emit("orchestration.thread", { thread: threadSummary(thread) });
  }
}

function cleanTitle(value: string): string {
  const line = value
    .split(/\r?\n/u)
    .map((part) => part.trim())
    .find(Boolean) ?? "";
  const clean = line
    .replace(/^[#*`'"\s]+|[#*`'"\s.!?]+$/gu, "")
    .replace(/\s+/gu, " ");
  return clean.length > 80 ? `${clean.slice(0, 77).trimEnd()}...` : clean;
}

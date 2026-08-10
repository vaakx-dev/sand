import {
  objectValue,
  stringValue,
  type JsonObject,
} from "@sand/extension-api";

import { Events } from "./events.ts";
import { Registry } from "./registry.ts";
import { createMessage, type AgentSession, Sessions, sessionSummary } from "./sessions.ts";
import { Settings } from "./settings.ts";

const TITLE_PROMPT = "Create a concise thread title from the user's first message. Return only the title, with no quotation marks, markdown, explanation, or ending punctuation. Use at most eight words.";

export class TitleGenerator {
  constructor(
    private readonly registry: Registry,
    private readonly settings: Settings,
    private readonly events: Events,
    private readonly sessions: Sessions,
  ) {}

  async generate(session: AgentSession, prompt: string, signal: AbortSignal): Promise<void> {
    const selected = objectValue(this.settings.get<JsonObject>("agent.titleGeneration", {}));
    const providerId = stringValue(selected.provider, "chatgpt");
    const provider = this.registry.providers.get(providerId);
    if (!provider) return;
    const model = stringValue(selected.model, provider.defaultModel || "default");
    const providerSettings = {
      ...this.settings.get<JsonObject>(`provider.${provider.id}`, {}),
      reasoning: stringValue(selected.reasoning, "medium"),
      serviceTier: "standard",
    };
    const response = await provider.complete({
      sessionId: session.id,
      model,
      messages: [
        createMessage("system", TITLE_PROMPT),
        createMessage("user", prompt),
      ],
      tools: [],
      settings: providerSettings,
      signal,
      onDelta() {},
    });
    const title = cleanTitle(response.content);
    if (!title || signal.aborted) return;
    session.title = title;
    await this.sessions.persist(session, false);
    this.events.emit("agent.session", { session: sessionSummary(session) });
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

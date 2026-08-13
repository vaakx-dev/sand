import type {
  AgentModelTraits,
  AgentProvider,
  AgentProviderRequest,
  AgentProviderResponse,
} from "@sand/extension-api";

import type { ChatGptAuth } from "./auth.ts";
import {
  CHATGPT_DEFAULT_MODEL,
  CHATGPT_CONTEXT_WINDOW,
  CHATGPT_MODEL_DEFAULTS,
  CHATGPT_MODELS,
} from "./models.ts";
import { CHATGPT_PRESENTATION, CHATGPT_PROVIDER_NAME } from "./presentation.ts";
import { requestBody } from "./request.ts";
import { readStream } from "./stream.ts";

const API_URL = "https://chatgpt.com/backend-api/codex/responses";

export class ChatGptProvider implements AgentProvider {
  readonly id = "chatgpt";
  readonly name = CHATGPT_PROVIDER_NAME;
  readonly defaultModel = CHATGPT_DEFAULT_MODEL;
  readonly modelDefaults = CHATGPT_MODEL_DEFAULTS;
  readonly models = CHATGPT_MODELS;
  readonly presentation = CHATGPT_PRESENTATION;

  constructor(private readonly auth: ChatGptAuth) {}

  async complete(request: AgentProviderRequest): Promise<AgentProviderResponse> {
    const credential = await this.auth.credentials(request.signal);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${credential.access}`,
      "chatgpt-account-id": credential.accountId,
      originator: "sand",
      "User-Agent": "sand/0.0.1",
      "OpenAI-Beta": "responses=experimental",
      accept: "text/event-stream",
      "content-type": "application/json",
    };
    if (request.threadId) headers["session-id"] = request.threadId;

    const response = await fetch(API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody(request, this.traits(request.model))),
      signal: request.signal,
    });
    if (!response.ok) {
      throw new Error(`ChatGPT returned ${response.status}: ${await response.text()}`);
    }
    const { usage, ...result } = await readStream(response, request);
    if (!usage) return result;
    const maxContextTokens = this.models.find((model) => model.slug === request.model)?.contextWindow
      ?? CHATGPT_CONTEXT_WINDOW;
    return {
      ...result,
      usage: { ...usage, maxContextTokens },
    };
  }

  private traits(model: string): AgentModelTraits {
    return this.models.find((item) => item.slug === model) ?? this.modelDefaults;
  }
}

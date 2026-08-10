import {
  numberValue,
  objectValue,
  selectProviderOption,
  stringValue,
  type AgentModelTraits,
  type AgentMessage,
  type AgentProvider,
  type AgentProviderRequest,
  type AgentToolCall,
  type JsonObject,
  type JsonValue,
} from "@sand/extension-api";

import type { ChatGptAuth } from "./auth.ts";
import {
  CHATGPT_DEFAULT_MODEL,
  CHATGPT_MODEL_DEFAULTS,
  CHATGPT_MODELS,
} from "./models.ts";
import { CHATGPT_PRESENTATION, CHATGPT_PROVIDER_NAME } from "./presentation.ts";

const API_URL = "https://chatgpt.com/backend-api/codex/responses";

interface PendingCall {
  id: string;
  name: string;
  arguments: string;
  index: number;
}

export class ChatGptProvider implements AgentProvider {
  readonly id = "chatgpt";
  readonly name = CHATGPT_PROVIDER_NAME;
  readonly defaultModel = CHATGPT_DEFAULT_MODEL;
  readonly modelDefaults = CHATGPT_MODEL_DEFAULTS;
  readonly models = CHATGPT_MODELS;
  readonly presentation = CHATGPT_PRESENTATION;

  constructor(private readonly auth: ChatGptAuth) {}

  async complete(request: AgentProviderRequest) {
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
    return readStream(response, request);
  }

  private traits(model: string): AgentModelTraits {
    return this.models.find((item) => item.slug === model) ?? this.modelDefaults;
  }
}

function requestBody(request: AgentProviderRequest, traits: AgentModelTraits): JsonObject {
  const instructions = request.messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n") || "You are a helpful coding assistant.";
  return {
    model: request.model,
    store: false,
    stream: true,
    instructions,
    input: responsesInput(request.messages),
    tools: request.tools.map((tool) => ({
      type: "function",
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      strict: false,
    })),
    "tool_choice": "auto",
    "parallel_tool_calls": true,
    reasoning: { effort: reasoningEffort(request.settings, traits), summary: "auto" },
    "service_tier": serviceTier(request.settings, traits),
    text: { verbosity: "low" },
    include: ["reasoning.encrypted_content"],
    "prompt_cache_key": request.threadId || crypto.randomUUID(),
  };
}

function reasoningEffort(settings: JsonObject, traits: AgentModelTraits): string {
  const effort = selectProviderOption(
    settings.reasoning,
    traits.reasoning,
    traits.defaultReasoning,
  );
  if (effort === "low" || effort === "medium" || effort === "high" || effort === "xhigh") {
    return effort;
  }
  return effort === "max" || effort === "ultra" ? "xhigh" : "high";
}

function serviceTier(settings: JsonObject, traits: AgentModelTraits): string {
  const tier = selectProviderOption(
    settings.serviceTier,
    traits.serviceTiers,
    traits.defaultServiceTier,
  );
  return tier === "fast" ? "priority" : "default";
}

function responsesInput(messages: AgentMessage[]): JsonValue[] {
  const input: JsonValue[] = [];
  for (const message of messages) {
    if (message.role === "system") continue;
    if (message.role === "tool") {
      input.push({
        type: "function_call_output",
        "call_id": message.toolCallId || "",
        output: message.content,
      });
      continue;
    }
    if (message.content) {
      input.push({
        role: message.role,
        content: [{
          type: message.role === "assistant" ? "output_text" : "input_text",
          text: message.content,
        }],
      });
    }
    for (const call of message.toolCalls || []) {
      input.push({
        type: "function_call",
        "call_id": call.id,
        name: call.name,
        arguments: JSON.stringify(call.arguments),
      });
    }
  }
  return input;
}

async function readStream(response: Response, request: AgentProviderRequest) {
  if (!response.body) throw new Error("ChatGPT returned an empty response stream");
  const calls = new Map<string, PendingCall>();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let content = "";
  let buffer = "";

  while (true) {
    const next = await reader.read();
    if (next.done) break;
    buffer += decoder.decode(next.value, { stream: true }).replaceAll("\r\n", "\n");
    const parsed = consumeEvents(buffer);
    buffer = parsed.remaining;
    for (const event of parsed.events) {
      const delta = applyEvent(event, calls);
      if (!delta) continue;
      content += delta;
      request.onDelta(delta);
    }
  }
  return {
    content,
    toolCalls: [...calls.values()]
      .sort((left, right) => left.index - right.index)
      .map(toolCall),
  };
}

function consumeEvents(buffer: string): {
  events: Record<string, unknown>[];
  remaining: string;
} {
  const events: Record<string, unknown>[] = [];
  let remaining = buffer;
  let boundary = remaining.indexOf("\n\n");
  while (boundary >= 0) {
    const block = remaining.slice(0, boundary);
    remaining = remaining.slice(boundary + 2);
    const data = block
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n");
    if (data && data !== "[DONE]") events.push(JSON.parse(data) as Record<string, unknown>);
    boundary = remaining.indexOf("\n\n");
  }
  return { events, remaining };
}

function applyEvent(event: Record<string, unknown>, calls: Map<string, PendingCall>): string {
  const type = stringValue(event.type);
  if (type === "error" || type === "response.failed") throw responseError(event);
  if (type === "response.output_text.delta") return stringValue(event.delta);

  const item = objectValue(event.item);
  if (
    (type === "response.output_item.added" || type === "response.output_item.done")
    && item.type === "function_call"
  ) {
    const id = stringValue(item["call_id"]) || stringValue(item.id) || crypto.randomUUID();
    const outputIndex = event["output_index"];
    const key = stringValue(item.id) || String(outputIndex ?? id);
    const call = calls.get(key) || pendingCall(id, outputIndex);
    call.id = id;
    call.name = stringValue(item.name) || call.name;
    if (typeof item.arguments === "string") call.arguments = item.arguments;
    calls.set(key, call);
  }
  if (type === "response.function_call_arguments.delta" && typeof event.delta === "string") {
    const outputIndex = event["output_index"];
    const key = stringValue(event["item_id"]) || String(outputIndex ?? "");
    const call = calls.get(key) || pendingCall(
      stringValue(event["call_id"]) || crypto.randomUUID(),
      outputIndex,
      stringValue(event.name),
    );
    call.arguments += event.delta;
    calls.set(key, call);
  }
  return "";
}

function pendingCall(id: string, index: unknown, name = ""): PendingCall {
  return {
    id,
    name,
    arguments: "",
    index: numberValue(index, Number.MAX_SAFE_INTEGER),
  };
}

function toolCall(value: PendingCall): AgentToolCall {
  let argumentsValue: JsonObject = {};
  try {
    argumentsValue = objectValue(JSON.parse(value.arguments || "{}") as JsonValue);
  } catch {
    argumentsValue = { input: value.arguments };
  }
  return { id: value.id, name: value.name, arguments: argumentsValue };
}

function responseError(event: Record<string, unknown>): Error {
  const nested = objectValue(event.error);
  const response = objectValue(event.response);
  const responseErrorValue = objectValue(response.error);
  const message = stringValue(event.message)
    || stringValue(nested.message)
    || stringValue(responseErrorValue.message)
    || "ChatGPT response failed";
  return new Error(message);
}

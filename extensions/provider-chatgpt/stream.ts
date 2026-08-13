import {
  numberValue,
  objectValue,
  stringValue,
  type AgentProviderRequest,
  type AgentToolCall,
  type JsonObject,
  type JsonValue,
} from "@sand/extension-api";

interface PendingCall {
  id: string;
  name: string;
  arguments: string;
  index: number;
}

export async function readStream(response: Response, request: AgentProviderRequest) {
  if (!response.body) throw new Error("ChatGPT returned an empty response stream");
  const calls = new Map<string, PendingCall>();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let content = "";
  let buffer = "";
  let usage: ResponseUsage | undefined;

  while (true) {
    const next = await reader.read();
    if (next.done) break;
    buffer += decoder.decode(next.value, { stream: true }).replaceAll("\r\n", "\n");
    const parsed = consumeEvents(buffer);
    buffer = parsed.remaining;
    for (const event of parsed.events) {
      usage = responseUsage(event) ?? usage;
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
    ...(usage ? { usage } : {}),
  };
}

interface ResponseUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

function responseUsage(event: Record<string, unknown>): ResponseUsage | undefined {
  const response = objectValue(event.response);
  const value = objectValue(response.usage);
  const inputTokens = numberValue(value["input_tokens"]);
  const outputTokens = numberValue(value["output_tokens"]);
  const totalTokens = numberValue(value["total_tokens"], inputTokens + outputTokens);
  if (totalTokens <= 0) return undefined;
  return { inputTokens, outputTokens, totalTokens };
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

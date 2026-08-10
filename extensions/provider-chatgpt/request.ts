import {
  selectProviderOption,
  type AgentMessage,
  type AgentModelTraits,
  type AgentProviderRequest,
  type JsonObject,
  type JsonValue,
} from "@sand/extension-api";

export function requestBody(
  request: AgentProviderRequest,
  traits: AgentModelTraits,
): JsonObject {
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

import type { AgentMessage, AgentThread } from "@sand/extension-api";

import { createMessage } from "../threads/store.ts";

const INTERRUPTED_TOOL_OUTPUT = JSON.stringify({
  error: "Tool execution was interrupted before a result was recorded.",
});

export function repairInterruptedTools(thread: AgentThread): AgentMessage[] {
  const completed = new Set(
    thread.messages
      .filter((message) => message.role === "tool" && message.toolCallId)
      .map((message) => message.toolCallId!),
  );
  const repaired: AgentMessage[] = [];
  for (const message of thread.messages) {
    if (message.role !== "assistant") continue;
    for (const call of message.toolCalls ?? []) {
      if (completed.has(call.id)) continue;
      const output = createMessage("tool", INTERRUPTED_TOOL_OUTPUT);
      output.toolCallId = call.id;
      repaired.push(output);
      completed.add(call.id);
    }
  }
  thread.messages.push(...repaired);
  return repaired;
}

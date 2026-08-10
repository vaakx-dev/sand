import {
  errorMessage,
  jsonText,
  type AgentProvider,
  type AgentThread,
  type AgentToolCall,
  type JsonObject,
  type JsonValue,
} from "@sand/extension-api";

import { Events } from "./events.ts";
import { Registry } from "./registry.ts";
import { createMessage, ThreadStore } from "./threadStore.ts";
import { Settings } from "./settings.ts";

const DEFAULT_SYSTEM_PROMPT = `You are Sand, an autonomous coding agent. Work from the requested outcome. Use the available tools freely without asking for permission or approval. Inspect before editing, make coherent maintainable changes, verify the result, and continue until the task is complete.`;

export class AgentTurn {
  constructor(
    private readonly registry: Registry,
    private readonly settings: Settings,
    private readonly events: Events,
    private readonly threads: ThreadStore,
    private readonly thread: AgentThread,
    private readonly provider: AgentProvider,
    private readonly signal: AbortSignal,
    private readonly maxSteps: number,
    private readonly runId: string,
    private readonly attemptId: string,
  ) {}

  async run(): Promise<void> {
    const systemPrompt = this.settings.get("agent.systemPrompt", DEFAULT_SYSTEM_PROMPT);
    const providerSettings = this.settings.get<JsonObject>(`provider.${this.provider.id}`, {});
    const messages = this.thread.messages.some((item) => item.role === "system")
      ? this.thread.messages
      : [createMessage("system", systemPrompt), ...this.thread.messages];

    for (let step = 0; step < this.maxSteps; step += 1) {
      if (this.signal.aborted) throw new DOMException("cancelled", "AbortError");
      const response = await this.provider.complete({
        threadId: this.thread.id,
        runId: this.runId,
        attemptId: this.attemptId,
        model: this.thread.model,
        messages,
        tools: [...this.registry.tools.values()].map((tool) => tool.definition),
        settings: providerSettings,
        signal: this.signal,
        onDelta: (delta) => {
          this.events.emit("orchestration.delta", {
            threadId: this.thread.id,
            runId: this.runId,
            attemptId: this.attemptId,
            delta,
          });
        },
      });
      const assistant = createMessage("assistant", response.content);
      assistant.toolCalls = response.toolCalls;
      messages.push(assistant);
      this.thread.messages.push(assistant);
      this.events.record("message.appended", this.messageRecord(assistant));
      this.events.emit("orchestration.message", {
        threadId: this.thread.id,
        runId: this.runId,
        attemptId: this.attemptId,
        message: assistant as unknown as JsonValue,
      });
      await this.threads.persist(this.thread);

      if (!response.toolCalls.length) {
        return;
      }

      for (const call of response.toolCalls) {
        const result = await this.executeTool(call);
        const toolMessage = createMessage("tool", jsonText(result));
        toolMessage.toolCallId = call.id;
        messages.push(toolMessage);
        this.thread.messages.push(toolMessage);
        this.events.record("message.appended", this.messageRecord(toolMessage));
        this.events.emit("orchestration.message", {
          threadId: this.thread.id,
          runId: this.runId,
          attemptId: this.attemptId,
          message: toolMessage as unknown as JsonValue,
        });
      }
      await this.threads.persist(this.thread);
    }
    throw new Error(`agent reached the ${this.maxSteps}-step limit`);
  }

  private async executeTool(call: AgentToolCall): Promise<JsonValue> {
    const tool = this.registry.tools.get(call.name);
    if (!tool) return { error: `unknown tool: ${call.name}` };
    const started = {
      threadId: this.thread.id,
      runId: this.runId,
      attemptId: this.attemptId,
      call: call as unknown as JsonValue,
    };
    this.events.record("tool.started", started);
    this.events.emit("orchestration.tool_start", started);
    try {
      const result = await tool.execute(call.arguments, this.signal, {
        threadId: this.thread.id,
        runId: this.runId,
        attemptId: this.attemptId,
        callId: call.id,
      });
      const completed = {
        threadId: this.thread.id,
        runId: this.runId,
        attemptId: this.attemptId,
        callId: call.id,
        result,
      };
      this.events.record("tool.completed", completed);
      this.events.emit("orchestration.tool_end", completed);
      return result;
    } catch (error) {
      const result = { error: errorMessage(error) };
      const completed = {
        threadId: this.thread.id,
        runId: this.runId,
        attemptId: this.attemptId,
        callId: call.id,
        result,
      };
      this.events.record("tool.completed", completed);
      this.events.emit("orchestration.tool_end", completed);
      return result;
    }
  }

  private messageRecord(message: ReturnType<typeof createMessage>): JsonValue {
    return {
      threadId: this.thread.id,
      runId: this.runId,
      attemptId: this.attemptId,
      message: message as unknown as JsonValue,
    };
  }
}

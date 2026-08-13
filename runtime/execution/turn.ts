import {
  errorMessage,
  jsonText,
  type AgentProvider,
  type AgentThread,
  type AgentToolCall,
  type JsonObject,
  type JsonValue,
} from "@sand/extension-api";

import { Events } from "../events.ts";
import { Registry } from "../extensions/registry.ts";
import { Settings } from "../settings.ts";
import { createMessage, ThreadStore } from "../threads/store.ts";
import { messageRecord } from "./records.ts";
import { nextContextUsage } from "./context.ts";

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
    private readonly runId: string,
    private readonly attemptId: string,
  ) {}

  async run(): Promise<void> {
    const systemPrompt = this.settings.get("agent.systemPrompt", DEFAULT_SYSTEM_PROMPT);
    const providerSettings = this.settings.get<JsonObject>(`provider.${this.provider.id}`, {});
    const messages = this.thread.messages.some((item) => item.role === "system")
      ? [...this.thread.messages]
      : [createMessage("system", systemPrompt), ...this.thread.messages];

    while (true) {
      this.throwIfAborted();
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
          if (this.signal.aborted) return;
          this.events.emit("agent.delta", {
            threadId: this.thread.id,
            runId: this.runId,
            attemptId: this.attemptId,
            delta,
          });
        },
      });
      this.throwIfAborted();
      this.thread.contextUsage = response.usage
        ? nextContextUsage(this.thread.contextUsage, response.usage)
        : this.thread.contextUsage;
      const assistant = createMessage("assistant", response.content);
      assistant.toolCalls = response.toolCalls;
      messages.push(assistant);
      this.appendMessage(assistant);

      if (!response.toolCalls.length) {
        return;
      }

      for (const call of response.toolCalls) {
        this.throwIfAborted();
        const result = await this.executeTool(call);
        this.throwIfAborted();
        const toolMessage = createMessage("tool", jsonText(result));
        toolMessage.toolCallId = call.id;
        messages.push(toolMessage);
        this.appendMessage(toolMessage);
      }
    }
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
    this.events.emit("agent.tool.started", started);
    try {
      const result = await tool.execute(call.arguments, this.signal, {
        threadId: this.thread.id,
        runId: this.runId,
        attemptId: this.attemptId,
        callId: call.id,
      });
      this.throwIfAborted();
      const completed = {
        threadId: this.thread.id,
        runId: this.runId,
        attemptId: this.attemptId,
        callId: call.id,
        result,
      };
      this.events.record("tool.completed", completed);
      this.events.emit("agent.tool.completed", completed);
      return result;
    } catch (error) {
      this.throwIfAborted();
      const result = { error: errorMessage(error) };
      const completed = {
        threadId: this.thread.id,
        runId: this.runId,
        attemptId: this.attemptId,
        callId: call.id,
        result,
      };
      this.events.record("tool.completed", completed);
      this.events.emit("agent.tool.completed", completed);
      return result;
    }
  }

  private appendMessage(message: ReturnType<typeof createMessage>): void {
    this.throwIfAborted();
    this.thread.messages.push(message);
    this.threads.touch(this.thread);
    this.events.record(
      "message.appended",
      messageRecord(this.thread, this.runId, this.attemptId, message),
    );
    this.events.emit("agent.message", {
      threadId: this.thread.id,
      runId: this.runId,
      attemptId: this.attemptId,
      message: message as unknown as JsonValue,
    });
  }

  private throwIfAborted(): void {
    if (this.signal.aborted) throw new DOMException("cancelled", "AbortError");
  }
}

import {
  errorMessage,
  jsonText,
  type AgentProvider,
  type AgentToolCall,
  type JsonObject,
  type JsonValue,
} from "@sand/extension-api";

import { Events } from "./events.ts";
import { Registry } from "./registry.ts";
import { createMessage, type AgentSession, Sessions, sessionSummary } from "./sessions.ts";
import { Settings } from "./settings.ts";

const DEFAULT_SYSTEM_PROMPT = `You are Sand, an autonomous coding agent. Work from the requested outcome. Use read, write, edit, and bash freely without asking for permission or approval. Use update_plan for work that benefits from visible multi-step tracking. Inspect before editing, make coherent maintainable changes, verify the result, and continue until the task is complete.`;

export class AgentTurn {
  constructor(
    private readonly registry: Registry,
    private readonly settings: Settings,
    private readonly events: Events,
    private readonly sessions: Sessions,
    private readonly session: AgentSession,
    private readonly provider: AgentProvider,
    private readonly signal: AbortSignal,
    private readonly maxSteps: number,
  ) {}

  async run(): Promise<void> {
    const systemPrompt = this.settings.get("agent.systemPrompt", DEFAULT_SYSTEM_PROMPT);
    const providerSettings = this.settings.get<JsonObject>(`provider.${this.provider.id}`, {});
    const messages = this.session.messages.some((item) => item.role === "system")
      ? this.session.messages
      : [createMessage("system", systemPrompt), ...this.session.messages];

    for (let step = 0; step < this.maxSteps; step += 1) {
      if (this.signal.aborted) throw new DOMException("cancelled", "AbortError");
      const response = await this.provider.complete({
        sessionId: this.session.id,
        model: this.session.model,
        messages,
        tools: [...this.registry.tools.values()].map((tool) => tool.definition),
        settings: providerSettings,
        signal: this.signal,
        onDelta: (delta) => {
          this.events.emit("agent.delta", { sessionId: this.session.id, delta });
        },
      });
      const assistant = createMessage("assistant", response.content);
      assistant.toolCalls = response.toolCalls;
      messages.push(assistant);
      this.session.messages.push(assistant);
      this.events.emit("agent.message", {
        sessionId: this.session.id,
        message: assistant as unknown as JsonValue,
      });
      await this.sessions.persist(this.session);

      if (!response.toolCalls.length) {
        this.session.status = "complete";
        this.session.statusChangedAt = new Date().toISOString();
        this.session.latestTurnCompletedAt = this.session.statusChangedAt;
        this.session.unread = true;
        this.events.emit("agent.status", { sessionId: this.session.id, status: "complete" });
        await this.sessions.persist(this.session);
        this.events.emit("agent.session", { session: sessionSummary(this.session) });
        return;
      }

      for (const call of response.toolCalls) {
        const result = await this.executeTool(call);
        const toolMessage = createMessage("tool", jsonText(result));
        toolMessage.toolCallId = call.id;
        messages.push(toolMessage);
        this.session.messages.push(toolMessage);
        this.events.emit("agent.message", {
          sessionId: this.session.id,
          message: toolMessage as unknown as JsonValue,
        });
      }
      await this.sessions.persist(this.session);
    }
    throw new Error(`agent reached the ${this.maxSteps}-step limit`);
  }

  private async executeTool(call: AgentToolCall): Promise<JsonValue> {
    const tool = this.registry.tools.get(call.name);
    if (!tool) return { error: `unknown tool: ${call.name}` };
    this.events.emit("agent.tool_start", {
      sessionId: this.session.id,
      call: call as unknown as JsonValue,
    });
    try {
      const result = await tool.execute(call.arguments, this.signal, {
        sessionId: this.session.id,
        callId: call.id,
      });
      this.events.emit("agent.tool_end", {
        sessionId: this.session.id,
        callId: call.id,
        result,
      });
      return result;
    } catch (error) {
      const result = { error: errorMessage(error) };
      this.events.emit("agent.tool_end", {
        sessionId: this.session.id,
        callId: call.id,
        result,
      });
      return result;
    }
  }
}

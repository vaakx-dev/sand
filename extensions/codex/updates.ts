import type { RpcPeer } from "./rpc.ts";
import {
  array,
  object,
  text,
  type CodexItem,
  type CodexTurn,
  type Session,
} from "./protocol.ts";

export function publishCodexNotification(
  acp: RpcPeer,
  session: Session,
  method: string,
  params: Record<string, unknown>,
): void {
  switch (method) {
    case "item/agentMessage/delta":
      agentDelta(acp, session, text(params.itemId), text(params.delta));
      break;
    case "item/started":
      toolStarted(acp, session, object(params.item) as unknown as CodexItem);
      break;
    case "item/completed":
      itemCompleted(acp, session, object(params.item) as unknown as CodexItem);
      break;
    case "turn/completed":
      turnCompleted(acp, session, object(params.turn) as unknown as CodexTurn);
      break;
    case "error":
      if (session.active && params.willRetry !== true) {
        session.active.error = text(object(params.error).message) || "Codex turn failed";
      }
      break;
    case "thread/name/updated":
      sessionInfo(acp, session.id, text(params.threadName));
      break;
  }
}

export function replay(acp: RpcPeer, sessionId: string, turns: CodexTurn[]): void {
  for (const turn of turns) {
    for (const value of turn.items ?? []) {
      if (value.type === "userMessage") {
        const content = userMessage(value.content);
        if (content) update(acp, sessionId, {
          sessionUpdate: "user_message_chunk",
          messageId: value.id,
          content: { type: "text", text: content },
        });
      } else if (value.type === "agentMessage" && value.text) {
        update(acp, sessionId, {
          sessionUpdate: "agent_message_chunk",
          messageId: value.id,
          content: { type: "text", text: value.text },
        });
      }
    }
  }
}

export function sessionInfo(acp: RpcPeer, sessionId: string, title: string): void {
  if (!title) return;
  update(acp, sessionId, {
    sessionUpdate: "session_info_update",
    title,
    updatedAt: new Date().toISOString(),
  });
}

function agentDelta(acp: RpcPeer, session: Session, itemId: string, delta: string): void {
  if (!session.active || !delta) return;
  session.active.streamed.set(itemId, (session.active.streamed.get(itemId) || "") + delta);
  update(acp, session.id, {
    sessionUpdate: "agent_message_chunk",
    messageId: itemId,
    content: { type: "text", text: delta },
  });
}

function itemCompleted(acp: RpcPeer, session: Session, value: CodexItem): void {
  if (value.type === "agentMessage") {
    const streamed = session.active?.streamed.get(value.id) || "";
    const full = value.text || "";
    agentDelta(acp, session, value.id, full.startsWith(streamed) ? full.slice(streamed.length) : full);
    return;
  }
  const tool = toolDescription(value);
  if (!tool) return;
  update(acp, session.id, {
    sessionUpdate: "tool_call_update",
    toolCallId: value.id,
    status: toolFailed(value) ? "failed" : "completed",
    rawOutput: tool.output,
  });
}

function toolStarted(acp: RpcPeer, session: Session, value: CodexItem): void {
  const tool = toolDescription(value);
  if (!tool) return;
  update(acp, session.id, {
    sessionUpdate: "tool_call",
    toolCallId: value.id,
    title: tool.title,
    name: tool.name,
    kind: tool.kind,
    status: "in_progress",
    rawInput: tool.input,
  });
}

function turnCompleted(acp: RpcPeer, session: Session, turn: CodexTurn): void {
  const active = session.active;
  if (!active) return;
  for (const value of turn.items ?? []) {
    if (value.type === "agentMessage") itemCompleted(acp, session, value);
  }
  session.active = undefined;
  if (turn.status === "failed") {
    active.reject(new Error(active.error || text(turn.error?.message) || "Codex turn failed"));
  } else {
    active.resolve(turn.status === "interrupted" ? "cancelled" : "end_turn");
  }
}

function toolDescription(value: CodexItem): {
  name: string;
  title: string;
  kind: "execute" | "edit" | "search" | "read" | "other";
  input: unknown;
  output: unknown;
} | undefined {
  switch (value.type) {
    case "commandExecution":
      return {
        name: "shell",
        title: value.command || "Run command",
        kind: "execute",
        input: { command: value.command, cwd: value.cwd },
        output: { output: value.aggregatedOutput, exitCode: value.exitCode },
      };
    case "fileChange":
      return {
        name: "apply_patch",
        title: "Apply file changes",
        kind: "edit",
        input: { changes: value.changes },
        output: { changes: value.changes, status: value.status },
      };
    case "mcpToolCall":
      return {
        name: [value.server, value.tool].filter(Boolean).join(".") || "mcp",
        title: value.tool || "MCP tool",
        kind: "other",
        input: value.arguments ?? null,
        output: value.result ?? value.error ?? null,
      };
    case "dynamicToolCall":
      return {
        name: value.tool || "tool",
        title: value.tool || "Tool",
        kind: "other",
        input: value.arguments ?? null,
        output: value.contentItems ?? null,
      };
    case "webSearch":
      return { name: "web_search", title: "Search the web", kind: "search", input: value, output: value };
    case "imageView":
      return { name: "view_image", title: "View image", kind: "read", input: value, output: value };
    default:
      return undefined;
  }
}

function userMessage(value: unknown): string {
  return array(value).map((entry) => {
    const input = object(entry);
    return input.type === "text" ? text(input.text) : "";
  }).filter(Boolean).join("\n\n");
}

function toolFailed(value: CodexItem): boolean {
  return value.status === "failed" || Boolean(value.error);
}

function update(acp: RpcPeer, sessionId: string, value: Record<string, unknown>): void {
  acp.notify("session/update", { sessionId, update: value });
}

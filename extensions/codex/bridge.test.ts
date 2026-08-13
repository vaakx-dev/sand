import { expect, test } from "bun:test";

import { CodexBridge } from "./bridge.ts";
import type { RpcPeer } from "./rpc.ts";

class FakePeer implements RpcPeer {
  readonly notifications: { method: string; params: unknown }[] = [];
  readonly requests: { method: string; params: unknown }[] = [];
  readonly handlers = new Map<string, (params: unknown) => unknown | Promise<unknown>>();

  async request<T = unknown>(method: string, params: unknown = null): Promise<T> {
    this.requests.push({ method, params });
    const handler = this.handlers.get(method);
    if (!handler) throw new Error(`unexpected request: ${method}`);
    return await handler(params) as T;
  }

  notify(method: string, params: unknown = null): void {
    this.notifications.push({ method, params });
  }
}

test("maps an ACP prompt to a Codex turn", async () => {
  const acp = new FakePeer();
  const codex = new FakePeer();
  codex.handlers.set("initialize", () => ({ userAgent: "codex-cli/0.147.0" }));
  codex.handlers.set("model/list", modelList);
  codex.handlers.set("thread/start", () => ({ thread: { id: "thread-1" } }));
  codex.handlers.set("turn/start", () => ({ turn: { id: "turn-1" } }));
  const bridge = new CodexBridge(acp, codex);
  bridge.start();

  const initialized = await bridge.requestFromAcp("initialize", {});
  expect(initialized).toMatchObject({
    protocolVersion: 1,
    agentInfo: { name: "codex", title: "Codex CLI", version: "codex-cli/0.147.0" },
  });
  const session = await bridge.requestFromAcp("session/new", { cwd: "D:\\workspace" });
  expect(session).toMatchObject({
    sessionId: "thread-1",
    configOptions: [
      { id: "model", currentValue: "gpt-test" },
      { id: "reasoning", currentValue: "medium" },
      { id: "serviceTier", currentValue: "standard" },
    ],
  });

  await bridge.requestFromAcp("session/set_config_option", {
    sessionId: "thread-1",
    configId: "reasoning",
    value: "high",
  });
  await bridge.requestFromAcp("session/set_config_option", {
    sessionId: "thread-1",
    configId: "serviceTier",
    value: "priority",
  });

  const prompt = bridge.requestFromAcp("session/prompt", {
    sessionId: "thread-1",
    prompt: [{ type: "text", text: "Fix the tests" }],
  });
  await Promise.resolve();
  await Promise.resolve();
  await bridge.notificationFromCodex("item/agentMessage/delta", {
    threadId: "thread-1",
    turnId: "turn-1",
    itemId: "message-1",
    delta: "Done",
  });
  await bridge.notificationFromCodex("turn/completed", {
    threadId: "thread-1",
    turn: { id: "turn-1", status: "completed", items: [] },
  });

  expect(await prompt).toEqual({ stopReason: "end_turn" });
  expect(codex.requests.find((request) => request.method === "turn/start")?.params).toEqual({
    threadId: "thread-1",
    input: [{ type: "text", text: "Fix the tests" }],
    model: "gpt-test",
    effort: "high",
    serviceTier: "priority",
  });
  expect(acp.notifications).toContainEqual({
    method: "session/update",
    params: {
      sessionId: "thread-1",
      update: {
        sessionUpdate: "agent_message_chunk",
        messageId: "message-1",
        content: { type: "text", text: "Done" },
      },
    },
  });
});

test("forwards Codex approvals through ACP", async () => {
  const acp = new FakePeer();
  const codex = new FakePeer();
  acp.handlers.set("session/request_permission", () => ({
    outcome: { outcome: "selected", optionId: "allow_once" },
  }));
  const bridge = new CodexBridge(acp, codex);

  const response = await bridge.requestFromCodex("item/commandExecution/requestApproval", {
    threadId: "thread-1",
    turnId: "turn-1",
    itemId: "command-1",
    command: "npm test",
  });

  expect(response).toEqual({ decision: "accept" });
  expect(acp.requests[0]).toMatchObject({
    method: "session/request_permission",
    params: {
      sessionId: "thread-1",
      toolCall: { toolCallId: "command-1", kind: "execute" },
    },
  });
});

test("resumes Codex history for an ACP session", async () => {
  const acp = new FakePeer();
  const codex = new FakePeer();
  codex.handlers.set("initialize", () => ({ userAgent: "codex-cli/test" }));
  codex.handlers.set("model/list", modelList);
  codex.handlers.set("thread/resume", () => ({
    thread: {
      id: "thread-1",
      name: "Existing task",
      turns: [{
        id: "turn-1",
        items: [
          { id: "user-1", type: "userMessage", content: [{ type: "text", text: "Hello" }] },
          { id: "agent-1", type: "agentMessage", text: "Hi" },
        ],
      }],
    },
  }));
  const bridge = new CodexBridge(acp, codex);
  bridge.start();

  await bridge.requestFromAcp("session/load", {
    sessionId: "thread-1",
    cwd: "D:\\workspace",
  });

  expect(acp.notifications.map((notification) => notification.params)).toEqual([
    {
      sessionId: "thread-1",
      update: {
        sessionUpdate: "session_info_update",
        title: "Existing task",
        updatedAt: expect.any(String),
      },
    },
    {
      sessionId: "thread-1",
      update: {
        sessionUpdate: "user_message_chunk",
        messageId: "user-1",
        content: { type: "text", text: "Hello" },
      },
    },
    {
      sessionId: "thread-1",
      update: {
        sessionUpdate: "agent_message_chunk",
        messageId: "agent-1",
        content: { type: "text", text: "Hi" },
      },
    },
  ]);
});

function modelList(): unknown {
  return {
    data: [{
      id: "gpt-test",
      model: "gpt-test",
      displayName: "GPT Test",
      isDefault: true,
      defaultReasoningEffort: "medium",
      supportedReasoningEfforts: [
        { reasoningEffort: "low" },
        { reasoningEffort: "medium" },
        { reasoningEffort: "high" },
      ],
      serviceTiers: [{ id: "priority", name: "Fast", description: "Faster responses" }],
      defaultServiceTier: null,
    }],
    nextCursor: null,
  };
}

import type { RpcPeer } from "./rpc.ts";
import { array, object, requiredText, text } from "./protocol.ts";

export class CodexApprovals {
  constructor(private readonly acp: RpcPeer) {}

  async handle(method: string, params: unknown): Promise<unknown> {
    const value = object(params);
    switch (method) {
      case "item/commandExecution/requestApproval":
        return {
          decision: await this.permission(value, "execute", text(value.command) || "Run command")
            ? "accept"
            : "decline",
        };
      case "item/fileChange/requestApproval":
        return {
          decision: await this.permission(value, "edit", text(value.reason) || "Apply file changes")
            ? "accept"
            : "decline",
        };
      case "execCommandApproval":
        return {
          decision: await this.permission(
            { ...value, threadId: value.conversationId, itemId: value.callId },
            "execute",
            array(value.command).map(String).join(" ") || "Run command",
          ) ? "approved" : { denied: { rejection: "Declined in Sand" } },
        };
      case "applyPatchApproval":
        return {
          decision: await this.permission(
            { ...value, threadId: value.conversationId, itemId: value.callId },
            "edit",
            text(value.reason) || "Apply file changes",
          ) ? "approved" : { denied: { rejection: "Declined in Sand" } },
        };
      case "item/tool/requestUserInput":
        return { answers: defaultAnswers(array(value.questions)) };
      case "mcpServer/elicitation/request":
        return { action: "cancel", content: null, _meta: null };
      default:
        throw new Error(`unsupported Codex request: ${method}`);
    }
  }

  private async permission(
    params: Record<string, unknown>,
    kind: "execute" | "edit",
    title: string,
  ): Promise<boolean> {
    const sessionId = requiredText(params.threadId, "Codex thread id");
    const toolCallId = text(params.itemId) || crypto.randomUUID();
    const response = object(await this.acp.request("session/request_permission", {
      sessionId,
      toolCall: { toolCallId, title, kind, rawInput: params },
      options: [
        { optionId: "allow_once", name: "Allow once", kind: "allow_once" },
        { optionId: "reject_once", name: "Reject", kind: "reject_once" },
      ],
    }));
    const outcome = object(response.outcome);
    return outcome.outcome === "selected" && outcome.optionId === "allow_once";
  }
}

function defaultAnswers(questions: unknown[]): Record<string, { answers: string[] }> {
  return Object.fromEntries(questions.flatMap((entry) => {
    const question = object(entry);
    const id = text(question.id);
    if (!id) return [];
    const first = object(array(question.options)[0]);
    return [[id, { answers: [text(first.label)].filter(Boolean) }]];
  }));
}

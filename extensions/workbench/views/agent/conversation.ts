import { details, div, dynamicChild, effect, el, icon, onRaf, show, span, summary } from "@vaakx-dev/vrui";
import { Check, Circle, Eye, SquarePen, SquareTerminal, Wrench } from "lucide";

import {
  jsonText,
  type AgentMessage,
  type AgentRun,
  type AgentToolCall,
} from "@sand/extension-api";

import type { WorkbenchState } from "../../state.ts";
import { markdown } from "./markdown.ts";

export function conversationView(state: WorkbenchState): HTMLElement {
  return div(
    {
      class: "messages",
      onMount: (element) => effect(() => {
        state.messages.get();
        state.agentDelta.get();
        return onRaf(() => {
          element.scrollTop = element.scrollHeight;
        });
      }),
    },
    dynamicChild(state.messages, (messages) => div(
      { class: "message-list" },
      ...messages.map((message, index) => messageView(message, messages, index)),
    )),
    dynamicChild(state.runs, (runs) => div(
      { class: "run-events" },
      ...runs.filter((run) => run.status === "interrupted" || run.status === "error")
        .map(runEvent),
    )),
    show(
      state.agentDelta.map(Boolean),
      () => div(
        { class: "assistant-turn streaming" },
        workDivider("Working"),
        div({ class: "message-content" }, state.agentDelta),
      ),
    ),
  );
}

function runEvent(run: AgentRun): HTMLElement {
  return div(
    { class: ["run-event", run.status] },
    span({ class: "run-event-title" }, run.status === "interrupted" ? "Run interrupted" : "Run failed"),
    run.error ? span({ class: "run-event-detail" }, run.error) : null,
  );
}

function messageView(
  message: AgentMessage,
  messages: AgentMessage[],
  index: number,
): HTMLElement {
  if (message.role === "tool" || message.role === "system") {
    return div({ class: "message-hidden" });
  }
  if (message.role === "user") {
    return div(
      { class: "message user" },
      div({ class: "message-content" }, message.content),
    );
  }

  const userIndex = previousUserIndex(messages, index);
  const firstAssistant = !messages
    .slice(userIndex + 1, index)
    .some((candidate) => candidate.role === "assistant");
  const end = turnEnd(messages, index);
  const resultByCall = new Map(
    messages
      .filter((candidate) => candidate.role === "tool" && candidate.toolCallId)
      .map((candidate) => [candidate.toolCallId!, candidate]),
  );

  return div(
    { class: ["assistant-turn", { continuation: !firstAssistant }] },
    firstAssistant ? workDivider(workedFor(messages[userIndex], end)) : null,
    message.content.trim() ? markdown(message.content) : null,
    message.toolCalls?.length
      ? toolCalls(message.toolCalls, resultByCall)
      : null,
  );
}

function toolCalls(
  calls: AgentToolCall[],
  results: Map<string, AgentMessage>,
): HTMLElement {
  return div(
    { class: "tool-call-group" },
    span(
      { class: "tool-call-count" },
      calls.length === 1 ? "1 tool call" : `${calls.length} tool calls`,
    ),
    ...calls.map((call) => toolCall(call, results.get(call.id))),
  );
}

function toolCall(call: AgentToolCall, result?: AgentMessage): HTMLElement {
  const complete = Boolean(result);
  return details(
    { class: ["tool-call", { complete }] },
    summary(
      { class: "tool-call-summary" },
      div({ class: "tool-call-icon" }, toolIcon(call.name)),
      span({ class: "tool-call-label" }, toolLabel(call.name)),
      span({ class: "tool-call-preview" }, toolPreview(call)),
      span(
        { class: "tool-call-state" },
        complete ? icon(Check, 12) : icon(Circle, 10),
      ),
    ),
    div(
      { class: "tool-call-body" },
      span({ class: "tool-call-section" }, "Input"),
      el("pre", { class: "tool-call-data" }, jsonText(call.arguments)),
      result
        ? [
            span({ class: "tool-call-section" }, "Output"),
            el("pre", { class: "tool-call-data output" }, result.content || "Completed"),
          ]
        : span({ class: "tool-call-running" }, "Running"),
    ),
  );
}

function toolIcon(name: string): HTMLElement {
  if (name === "bash") return icon(SquareTerminal, 13);
  if (name === "read") return icon(Eye, 13);
  if (name === "write" || name === "edit") return icon(SquarePen, 13);
  return icon(Wrench, 13);
}

function toolLabel(name: string): string {
  if (name === "bash") return "Ran command";
  if (name === "read") return "Read file";
  if (name === "write") return "Wrote file";
  if (name === "edit") return "Edited file";
  return name.replaceAll("_", " ");
}

function toolPreview(call: AgentToolCall): string {
  const value = call.arguments.command ?? call.arguments.path;
  if (typeof value !== "string") return "";
  const compact = value.replace(/\s+/gu, " ").trim();
  return compact.length > 110 ? `${compact.slice(0, 107)}...` : compact;
}

function previousUserIndex(messages: AgentMessage[], index: number): number {
  for (let candidate = index - 1; candidate >= 0; candidate -= 1) {
    if (messages[candidate]?.role === "user") return candidate;
  }
  return -1;
}

function turnEnd(messages: AgentMessage[], index: number): AgentMessage {
  let end = messages[index]!;
  for (let candidate = index + 1; candidate < messages.length; candidate += 1) {
    const message = messages[candidate]!;
    if (message.role === "user") break;
    if (message.role === "assistant") end = message;
  }
  return end;
}

function workDivider(label: string): HTMLElement {
  return div(
    { class: "work-divider" },
    span(label),
    span({ class: "work-divider-line" }),
  );
}

function workedFor(previous: AgentMessage | undefined, message: AgentMessage): string {
  if (!previous || previous.role !== "user") return "Response";
  const start = new Date(previous.createdAt).getTime();
  const end = new Date(message.createdAt).getTime();
  const seconds = Math.max(0, Math.round((end - start) / 1_000));
  if (!Number.isFinite(seconds) || seconds < 1) return "Worked for <1s";
  if (seconds < 60) return `Worked for ${seconds}s`;
  return `Worked for ${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

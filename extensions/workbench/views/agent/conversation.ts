import { derive, details, div, dynamicChild, effect, el, icon, onRaf, show, sig, span, summary } from "@vaakx-dev/vrui";
import { Check, Circle, Wrench } from "lucide";

import {
  jsonText,
  type AgentMessage,
  type AgentRun,
  type AgentToolCall,
} from "@sand/extension-api";
import type { UiToolRegistry } from "../../api.ts";

import type { WorkbenchState } from "../../state.ts";
import { markdown } from "./markdown.ts";
import { styled } from "sand:api/ui";
import { tokens } from "sand:api/ui";

const Messages = styled(div, { minHeight: 0, flex: 1, overflow: "auto", padding: `${tokens.size.header}px max(${tokens.space.section}px, calc((100% - var(--content-width)) / 2)) ${tokens.space.content}px`, display: "flex", flexDirection: "column", gap: tokens.space.section });
const MessageList = styled(div, { display: "flex", flexDirection: "column", gap: tokens.space.content });
const MessageContent = styled(div, { color: "var(--text)", fontSize: tokens.font.content, lineHeight: tokens.line.content, whiteSpace: "pre-wrap", overflowWrap: "anywhere" });
const UserMessage = styled(div, { alignSelf: "flex-end", width: "fit-content", maxWidth: "80%", padding: `${tokens.space.large}px ${tokens.space.section}px`, borderRadius: tokens.radius.dialog, background: "var(--elevated)" });
const AssistantTurn = styled(div, { display: "flex", flexDirection: "column", gap: tokens.space.section, "&[data-continuation=true]": { marginTop: -tokens.space.large } });
const ToolGroup = styled(div, { display: "flex", flexDirection: "column", gap: tokens.space.compact });
const ToolCount = styled(span, { marginBottom: tokens.space.compact, color: "var(--muted)", fontSize: tokens.font.caption });
const ToolCall = styled(details, { minWidth: 0, color: "var(--muted)", "&[data-complete=true] [data-state]": { color: "var(--success)" } });
const ToolSummary = styled(summary, { minWidth: 0, minHeight: tokens.size.control, display: "flex", alignItems: "center", gap: tokens.space.medium, padding: tokens.space.small, borderRadius: tokens.radius.control, cursor: "pointer", listStyle: "none", "&::-webkit-details-marker": { display: "none" }, "&:hover": { color: "var(--text)", background: "var(--surface)" } });
const ToolIcon = styled(div, { width: tokens.size.controlTiny, height: tokens.size.controlTiny, display: "grid", placeItems: "center", flex: `0 0 ${tokens.size.controlTiny}px`, color: "var(--muted)" });
const ToolLabel = styled(span, { flex: "0 0 auto", color: "var(--text)", fontSize: tokens.font.small, fontWeight: tokens.weight.medium });
const ToolPreview = styled(span, { minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--muted)", font: `${tokens.font.caption}px var(--mono)` });
const ToolState = styled(span, { width: tokens.size.controlTiny, height: tokens.size.controlTiny, display: "grid", placeItems: "center", flex: `0 0 ${tokens.size.controlTiny}px`, color: "var(--warning)" });
const ToolBody = styled(div, { margin: `${tokens.space.compact}px ${tokens.space.small}px ${tokens.space.medium}px ${tokens.size.controlLarge}px`, padding: `${tokens.space.medium}px ${tokens.space.large}px`, borderLeft: "1px solid var(--border)", color: "var(--muted)", background: "var(--surface)" });
const ToolSection = styled(span, { display: "block", marginBottom: tokens.space.small, color: "var(--muted)", fontSize: tokens.font.caption, fontWeight: tokens.weight.semibold, textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", "&:not(:first-child)": { marginTop: tokens.space.large } });
const ToolData = styled(el.bind(null, "pre"), { maxHeight: 256, margin: 0, overflow: "auto", color: "var(--muted)", background: "transparent", font: `${tokens.font.caption}px/1.5 var(--mono)`, whiteSpace: "pre-wrap", overflowWrap: "anywhere", "&[data-output=true]": { color: "var(--text)" } });
const Running = styled(span, { color: "var(--accent)", fontSize: tokens.font.caption });
const WorkDivider = styled(div, { display: "flex", alignItems: "center", gap: tokens.space.medium, color: "var(--muted)", fontSize: tokens.font.caption });
const WorkLine = styled(span, { height: 1, flex: 1, background: "var(--border)" });
const RunEvents = styled(div, { display: "flex", flexDirection: "column", gap: tokens.space.medium });
const RunEvent = styled(div, {
  padding: `${tokens.space.medium}px ${tokens.space.large}px`,
  border: "1px solid var(--border)",
  borderRadius: tokens.radius.row,
  color: "var(--muted)",
  background: "var(--surface)",
  "&[data-status=error]": { borderColor: "var(--danger)", color: "var(--danger)" },
});
const RunEventTitle = styled(span, { display: "block", color: "inherit", fontWeight: tokens.weight.semibold });
const RunEventDetail = styled(span, { display: "block", marginTop: tokens.space.small, color: "var(--muted)", fontSize: tokens.font.caption });

export function conversationView(state: WorkbenchState, tools: UiToolRegistry): HTMLElement {
  const toolRevision = sig(0);
  const messages = derive(() => {
    toolRevision.get();
    return state.threads.messages.get();
  });
  return Messages(
    {
      onMount: (element) => {
        const unsubscribe = tools.subscribe(() => toolRevision.update((value) => value + 1));
        const stop = effect(() => {
          state.threads.messages.get();
          state.threads.delta.get();
          return onRaf(() => {
            element.scrollTop = element.scrollHeight;
          });
        });
        return () => {
          unsubscribe();
          stop();
        };
      },
    },
    dynamicChild(messages, (messages) => MessageList(
      {},
      ...messages.map((message, index) => messageView(message, messages, index, tools)),
    )),
    dynamicChild(state.threads.runs, (runs) => RunEvents(
      {},
      ...runs.filter((run) => run.status === "interrupted" || run.status === "error")
        .map(runEvent),
    )),
    show(
      state.threads.delta.map(Boolean),
      () => AssistantTurn(
        {},
        workDivider("Working"),
        MessageContent({}, state.threads.delta),
      ),
    ),
  );
}

function runEvent(run: AgentRun): HTMLElement {
  return RunEvent(
    { "data-status": run.status },
    RunEventTitle({}, run.status === "interrupted" ? "Run interrupted" : "Run failed"),
    run.error ? RunEventDetail({}, run.error) : null,
  );
}

function messageView(
  message: AgentMessage,
  messages: AgentMessage[],
  index: number,
  tools: UiToolRegistry,
): HTMLElement {
  if (message.role === "tool" || message.role === "system") {
    return div({ hidden: true });
  }
  if (message.role === "user") {
    return UserMessage(
      {},
      MessageContent({}, message.content),
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

  return AssistantTurn(
    { "data-continuation": !firstAssistant },
    firstAssistant ? workDivider(workedFor(messages[userIndex], end)) : null,
    message.content.trim() ? markdown(message.content) : null,
    message.toolCalls?.length
      ? toolCalls(message.toolCalls, resultByCall, tools)
      : null,
  );
}

function toolCalls(
  calls: AgentToolCall[],
  results: Map<string, AgentMessage>,
  tools: UiToolRegistry,
): HTMLElement {
  return ToolGroup(
    {},
    ToolCount(
      {},
      calls.length === 1 ? "1 tool call" : `${calls.length} tool calls`,
    ),
    ...calls.map((call) => toolCall(call, results.get(call.id), tools)),
  );
}

function toolCall(
  call: AgentToolCall,
  result: AgentMessage | undefined,
  tools: UiToolRegistry,
): HTMLElement {
  const complete = Boolean(result);
  const presentation = tools.get(call.name);
  return ToolCall(
    { "data-complete": complete },
    ToolSummary(
      {},
      ToolIcon(
        {},
        presentation?.renderIcon(tokens.size.iconCompact) ?? icon(Wrench, tokens.size.iconCompact),
      ),
      ToolLabel({}, presentation?.label ?? toolLabel(call.name)),
      ToolPreview({}, presentation?.preview?.(call.arguments) ?? ""),
      ToolState(
        { "data-state": "" },
        complete ? icon(Check, tokens.size.iconTiny) : icon(Circle, tokens.size.iconTiny),
      ),
    ),
    ToolBody(
      {},
      ToolSection({}, "Input"),
      ToolData({}, jsonText(call.arguments)),
      result
        ? [
            ToolSection({}, "Output"),
            ToolData({ "data-output": true }, result.content || "Completed"),
          ]
        : Running({}, "Running"),
    ),
  );
}

function toolLabel(name: string): string {
  return name.replaceAll("_", " ");
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
  return WorkDivider(
    {},
    span(label),
    WorkLine({}),
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

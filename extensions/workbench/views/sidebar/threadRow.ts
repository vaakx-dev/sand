import { button, derive, div, dynamicChild, icon, span, stopThen } from "@vaakx-dev/vrui";
import type { Sig } from "@vaakx-dev/vrui";
import { AlarmClockOff, Check, Clock3, Folder, MessageSquare, Pin, Undo2 } from "lucide";

import {
  canSettleThread,
  canSnoozeThread,
  comparePinnedThreads,
  isThreadSettled,
  isThreadWoke,
  settledTimestamp,
  snoozeWakeLabel,
  threadLastActivityAt,
  threadStatus,
  type AgentSessionSummary,
  type ThreadSection,
  type ThreadStatus,
} from "@sand/extension-api";

import type { WorkbenchController } from "../../controller.ts";
import type { WorkbenchState } from "../../state.ts";
import { openaiIcon } from "../agent/icons.ts";
import { projectName, relativeTime, workingDuration } from "../format.ts";
import { snoozePresets } from "./snoozePresets.ts";

export function threadHoverCard(state: WorkbenchState): HTMLElement {
  return dynamicChild(
    derive(() => state.sidebarOpen.get() && state.activity.get() === "threads"
      ? state.threadPreview.get()
      : null),
    (session) => session
      ? div(
          {
            class: "thread-hover-card",
            style: {
              left: state.sidebarWidth.map((width) => `${width + 8}px`),
              top: state.threadPreviewTop.map((top) => `${top}px`),
            },
          },
          span({ class: "thread-hover-title" }, session.title),
          div({ class: "thread-hover-line" }, icon(Folder, 12), state.root.map(projectName)),
          div({ class: "thread-hover-line" }, openaiIcon(12), session.model),
          div(
            { class: ["thread-hover-status", threadStatus(session)] },
            hoverStatus(session, state.autoSettleDays.get()),
            span(relativeTime(threadLastActivityAt(session))),
          ),
        )
      : div({ hidden: true }),
  );
}

export function sessionRow(
  controller: WorkbenchController,
  state: WorkbenchState,
  clock: Sig<number>,
  session: AgentSessionSummary,
  section: ThreadSection,
): HTMLElement {
  const slim = section === "snoozed" || section === "settled";
  const open = () => void controller.agent.openSession(session.id);
  const providerIcon = session.provider === "chatgpt" || session.model.toLowerCase().startsWith("gpt")
    ? openaiIcon(12)
    : null;
  return div(
    {
      class: ["thread-card", section, {
        active: state.sessionId.map((id) => id === session.id),
        unread: session.unread,
        woke: clock.map((now) => isThreadWoke(session, now)),
        slim,
      }],
      role: "button",
      tabIndex: 0,
      draggable: section === "pinned",
      onClick: open,
      onDragStart: (event) => {
        if (section !== "pinned") return;
        event.dataTransfer?.setData("application/x-sand-thread", session.id);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
      },
      onDragOver: (event) => {
        if (section === "pinned") event.preventDefault();
      },
      onDrop: (event) => {
        if (section !== "pinned") return;
        event.preventDefault();
        const source = event.dataTransfer?.getData("application/x-sand-thread");
        if (!source || source === session.id) return;
        const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const pins = state.sessions.get().filter((item) => item.pinned).sort(comparePinnedThreads);
        const targetIndex = pins.findIndex((item) => item.id === session.id);
        const afterTarget = pins[targetIndex + 1]?.id;
        const beforeId = event.clientY < bounds.top + bounds.height / 2
          ? session.id
          : afterTarget;
        void controller.agent.reorderPin(source, beforeId);
      },
      onMouseEnter: (event) => {
        const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
        state.threadPreviewTop.set(Math.max(8, Math.min(bounds.top, window.innerHeight - 126)));
        state.threadPreview.set(session);
      },
      onMouseLeave: () => {
        if (state.threadPreview.get()?.id === session.id) state.threadPreview.set(null);
      },
      onContextMenu: (event) => {
        event.preventDefault();
        state.threadPreview.set(null);
        state.threadMenu.set({ session, x: event.clientX, y: event.clientY });
      },
      onKeyDown: (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        open();
      },
    },
    slim
      ? slimContent(controller, session, section, clock)
      : fullContent(controller, state, session, section, clock, providerIcon),
  );
}

function slimContent(
  controller: WorkbenchController,
  session: AgentSessionSummary,
  section: "snoozed" | "settled",
  clock: Sig<number>,
): HTMLElement {
  return div(
    { class: "thread-slim-row" },
    icon(MessageSquare, 13),
    span({ class: "thread-title" }, session.title),
    span(
      { class: "thread-row-slot" },
      span(
        { class: "thread-time" },
        clock.map((now) => section === "snoozed" && session.snoozedUntil
          ? snoozeWakeLabel(session.snoozedUntil, now)
          : relativeTime(settledTimestamp(session), now)),
      ),
      button(
        {
          class: "thread-row-action",
          "aria-label": section === "snoozed" ? "Wake thread now" : "Un-settle thread",
          "data-tooltip": section === "snoozed" ? "Wake thread now" : "Un-settle thread",
          onClick: stopThen(() => section === "snoozed"
            ? void controller.agent.snoozeSession(session.id)
            : void controller.agent.settleSession(session.id, false)),
        },
        icon(section === "snoozed" ? AlarmClockOff : Undo2, 13),
      ),
    ),
  );
}

function fullContent(
  controller: WorkbenchController,
  state: WorkbenchState,
  session: AgentSessionSummary,
  section: "pinned" | "active",
  clock: Sig<number>,
  providerIcon: SVGSVGElement | null,
): HTMLElement {
  const now = Date.now();
  const canSettle = canSettleThread(session, now);
  const canSnooze = canSnoozeThread(session, now);
  return div(
    { class: "thread-card-content" },
    div(
      { class: "thread-card-top" },
      icon(Folder, 12),
      span({ class: "thread-project" }, state.root.map(projectName)),
      section === "pinned"
        ? button(
            {
              class: "thread-pin-state",
              "aria-label": "Unpin thread",
              "data-tooltip": "Unpin thread",
              onClick: stopThen(() => void controller.agent.pinSession(session.id, false)),
            },
            icon(Pin, 11),
          )
        : null,
      span(
        { class: ["thread-row-slot", { actionable: canSettle || canSnooze }] },
        span(
          { class: ["thread-status-label", threadStatus(session)] },
          clock.map((value) => rowStatusLabel(session, value)),
        ),
        canSettle || canSnooze
          ? span(
              { class: "thread-row-actions" },
              canSnooze
                ? button(
                    {
                      class: "thread-row-action",
                      "aria-label": "Snooze thread for one hour",
                      "data-tooltip": "Snooze for 1 hour",
                      onClick: stopThen(() => void controller.agent.snoozeSession(
                        session.id,
                        snoozePresets()[0]?.until,
                      )),
                    },
                    icon(Clock3, 12),
                  )
                : null,
              canSettle
                ? button(
                    {
                      class: "thread-row-action",
                      "aria-label": "Settle thread",
                      "data-tooltip": "Settle thread",
                      onClick: stopThen(() => void controller.agent.settleSession(session.id, true)),
                    },
                    icon(Check, 13),
                  )
                : null,
            )
          : null,
      ),
    ),
    span({ class: "thread-title" }, session.title),
    div({ class: "thread-meta" }, span(session.model), providerIcon),
  );
}

function rowStatusLabel(session: AgentSessionSummary, now: number): string {
  if (isThreadWoke(session, now)) return "Woke";
  const status = threadStatus(session);
  if (status === "working") {
    return `Working ${workingDuration(
      session.latestTurnStartedAt ?? session.statusChangedAt ?? session.updatedAt,
      now,
    )}`;
  }
  if (status === "ready") {
    return session.unread && session.status === "complete"
      ? "Completed"
      : relativeTime(threadLastActivityAt(session), now);
  }
  return statusLabel(status);
}

function statusLabel(status: Exclude<ThreadStatus, "ready">): string {
  switch (status) {
    case "approval": return "Pending approval";
    case "input": return "Awaiting input";
    case "working": return "Working";
    case "monitoring": return "Monitoring";
    case "failed": return "Failed";
  }
}

function hoverStatus(session: AgentSessionSummary, autoSettleAfterDays: number | null): string {
  const now = Date.now();
  if (isThreadWoke(session, now)) return "Woke";
  if (session.snoozedUntil && Date.parse(session.snoozedUntil) > now) {
    return `Snoozed, ${snoozeWakeLabel(session.snoozedUntil, now)}`;
  }
  if (isThreadSettled(session, { now, autoSettleAfterDays })) return "Settled";
  const status = threadStatus(session);
  return status === "ready" ? "Ready" : statusLabel(status);
}

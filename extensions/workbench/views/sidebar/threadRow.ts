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
  type AgentThreadSummary,
  type ThreadSection,
  type ThreadStatus,
} from "@sand/extension-api";

import type { WorkbenchController } from "../../controller.ts";
import { findModel, findProvider, modelName } from "../../modelCatalog.ts";
import type { WorkbenchState } from "../../state.ts";
import { projectName, relativeTime, workingDuration } from "../format.ts";
import { providerIcon } from "../shared/providerIcon.ts";
import { snoozePresets } from "./snoozePresets.ts";

export function threadHoverCard(state: WorkbenchState): HTMLElement {
  return dynamicChild(
    derive(() => state.sidebarOpen.get() && state.activity.get() === "threads"
      ? state.threadPreview.get()
      : null),
    (thread) => thread
      ? div(
          {
            class: "thread-hover-card",
            style: {
              left: state.sidebarWidth.map((width) => `${width + 8}px`),
              top: state.threadPreviewTop.map((top) => `${top}px`),
            },
          },
          span({ class: "thread-hover-title" }, thread.title),
          div({ class: "thread-hover-line" }, icon(Folder, 12), state.root.map(projectName)),
          div(
            { class: "thread-hover-line" },
            providerIcon(findProvider(state.providers.get(), thread.provider), 12),
            threadModelName(state, thread),
          ),
          div(
            { class: ["thread-hover-status", threadStatus(thread)] },
            hoverStatus(thread, state.autoSettleDays.get()),
            span(relativeTime(threadLastActivityAt(thread))),
          ),
        )
      : div({ hidden: true }),
  );
}

export function threadRow(
  controller: WorkbenchController,
  state: WorkbenchState,
  clock: Sig<number>,
  thread: AgentThreadSummary,
  section: ThreadSection,
): HTMLElement {
  const slim = section === "snoozed" || section === "settled";
  const open = () => void controller.agent.openThread(thread.id);
  const threadProviderIcon = providerIcon(
    findProvider(state.providers.get(), thread.provider),
    12,
  );
  return div(
    {
      class: ["thread-card", section, {
        active: state.threadId.map((id) => id === thread.id),
        unread: thread.unread,
        woke: clock.map((now) => isThreadWoke(thread, now)),
        slim,
      }],
      role: "button",
      tabIndex: 0,
      draggable: section === "pinned",
      onClick: open,
      onDragStart: (event) => {
        if (section !== "pinned") return;
        event.dataTransfer?.setData("application/x-sand-thread", thread.id);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
      },
      onDragOver: (event) => {
        if (section === "pinned") event.preventDefault();
      },
      onDrop: (event) => {
        if (section !== "pinned") return;
        event.preventDefault();
        const source = event.dataTransfer?.getData("application/x-sand-thread");
        if (!source || source === thread.id) return;
        const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const pins = state.threads.get().filter((item) => item.pinned).sort(comparePinnedThreads);
        const targetIndex = pins.findIndex((item) => item.id === thread.id);
        const afterTarget = pins[targetIndex + 1]?.id;
        const beforeId = event.clientY < bounds.top + bounds.height / 2
          ? thread.id
          : afterTarget;
        void controller.agent.reorderPin(source, beforeId);
      },
      onMouseEnter: (event) => {
        const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
        state.threadPreviewTop.set(Math.max(8, Math.min(bounds.top, window.innerHeight - 126)));
        state.threadPreview.set(thread);
      },
      onMouseLeave: () => {
        if (state.threadPreview.get()?.id === thread.id) state.threadPreview.set(null);
      },
      onContextMenu: (event) => {
        event.preventDefault();
        state.threadPreview.set(null);
        state.threadMenu.set({ thread, x: event.clientX, y: event.clientY });
      },
      onKeyDown: (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        open();
      },
    },
    slim
      ? slimContent(controller, thread, section, clock)
      : fullContent(controller, state, thread, section, clock, threadProviderIcon),
  );
}

function slimContent(
  controller: WorkbenchController,
  thread: AgentThreadSummary,
  section: "snoozed" | "settled",
  clock: Sig<number>,
): HTMLElement {
  return div(
    { class: "thread-slim-row" },
    icon(MessageSquare, 13),
    span({ class: "thread-title" }, thread.title),
    span(
      { class: "thread-row-slot" },
      span(
        { class: "thread-time" },
        clock.map((now) => section === "snoozed" && thread.snoozedUntil
          ? snoozeWakeLabel(thread.snoozedUntil, now)
          : relativeTime(settledTimestamp(thread), now)),
      ),
      button(
        {
          class: "thread-row-action",
          "aria-label": section === "snoozed" ? "Wake thread now" : "Un-settle thread",
          "data-tooltip": section === "snoozed" ? "Wake thread now" : "Un-settle thread",
          onClick: stopThen(() => section === "snoozed"
            ? void controller.agent.snoozeThread(thread.id)
            : void controller.agent.settleThread(thread.id, false)),
        },
        icon(section === "snoozed" ? AlarmClockOff : Undo2, 13),
      ),
    ),
  );
}

function fullContent(
  controller: WorkbenchController,
  state: WorkbenchState,
  thread: AgentThreadSummary,
  section: "pinned" | "active",
  clock: Sig<number>,
  threadProviderIcon: HTMLElement,
): HTMLElement {
  const now = Date.now();
  const canSettle = canSettleThread(thread, now);
  const canSnooze = canSnoozeThread(thread, now);
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
              onClick: stopThen(() => void controller.agent.pinThread(thread.id, false)),
            },
            icon(Pin, 11),
          )
        : null,
      span(
        { class: ["thread-row-slot", { actionable: canSettle || canSnooze }] },
        span(
          { class: ["thread-status-label", threadStatus(thread)] },
          clock.map((value) => rowStatusLabel(thread, value)),
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
                      onClick: stopThen(() => void controller.agent.snoozeThread(
                        thread.id,
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
                      onClick: stopThen(() => void controller.agent.settleThread(thread.id, true)),
                    },
                    icon(Check, 13),
                  )
                : null,
            )
          : null,
      ),
    ),
    span({ class: "thread-title" }, thread.title),
    div(
      { class: "thread-meta" },
      span(threadModelName(state, thread)),
      threadProviderIcon,
    ),
  );
}

function threadModelName(state: WorkbenchState, thread: AgentThreadSummary): string {
  return modelName(
    findModel(state.providerModels.get(), thread.provider, thread.model),
    thread.model,
  );
}

function rowStatusLabel(thread: AgentThreadSummary, now: number): string {
  if (isThreadWoke(thread, now)) return "Woke";
  const status = threadStatus(thread);
  if (status === "working") {
    return `Working ${workingDuration(
      thread.latestTurnStartedAt ?? thread.statusChangedAt ?? thread.updatedAt,
      now,
    )}`;
  }
  if (status === "ready") {
    return thread.unread && thread.status === "complete"
      ? "Completed"
      : relativeTime(threadLastActivityAt(thread), now);
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

function hoverStatus(thread: AgentThreadSummary, autoSettleAfterDays: number | null): string {
  const now = Date.now();
  if (isThreadWoke(thread, now)) return "Woke";
  if (thread.snoozedUntil && Date.parse(thread.snoozedUntil) > now) {
    return `Snoozed, ${snoozeWakeLabel(thread.snoozedUntil, now)}`;
  }
  if (isThreadSettled(thread, { now, autoSettleAfterDays })) return "Settled";
  const status = threadStatus(thread);
  return status === "ready" ? "Ready" : statusLabel(status);
}

import { div, icon, span, stopThen, type Sig } from "@vaakx-dev/vrui";
import { AlarmClockOff, Check, Clock3, Folder, MessageSquare, Pin, Undo2 } from "lucide";

import {
  canSettleThread,
  canSnoozeThread,
  settledTimestamp,
  snoozeWakeLabel,
  threadStatus,
  type AgentThreadSummary,
  type UiControls,
} from "@sand/extension-api";

import type { WorkbenchController } from "../../../controller.ts";
import { findProvider } from "../../../modelCatalog.ts";
import type { WorkbenchState } from "../../../state.ts";
import { projectName, relativeTime } from "../../format.ts";
import { providerIcon } from "../../shared/providerIcon.ts";
import { presets } from "./snooze.ts";
import { modelLabel, rowLabel } from "./status.ts";

export function slimContent(
  controller: WorkbenchController,
  controls: UiControls,
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
      controls.iconButton({
        label: section === "snoozed" ? "Wake thread now" : "Un-settle thread",
        variant: "compact",
        className: "thread-row-action",
        renderIcon: (size) => icon(section === "snoozed" ? AlarmClockOff : Undo2, size),
        onClick: stopThen(() => section === "snoozed"
          ? void controller.threads.snooze(thread.id)
          : void controller.threads.settle(thread.id, false)),
      }),
    ),
  );
}

export function fullContent(
  controller: WorkbenchController,
  state: WorkbenchState,
  controls: UiControls,
  thread: AgentThreadSummary,
  section: "pinned" | "active",
  clock: Sig<number>,
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
        ? controls.iconButton({
            label: "Unpin thread",
            variant: "compact",
            className: "thread-pin-state",
            renderIcon: (size) => icon(Pin, size),
            onClick: stopThen(() => void controller.threads.pin(thread.id, false)),
          })
        : null,
      span(
        { class: ["thread-row-slot", { actionable: canSettle || canSnooze }] },
        span(
          { class: ["thread-status-label", threadStatus(thread)] },
          clock.map((value) => rowLabel(thread, value)),
        ),
        canSettle || canSnooze
          ? span(
              { class: "thread-row-actions" },
              canSnooze
                ? controls.iconButton({
                    label: "Snooze for 1 hour",
                    variant: "compact",
                    className: "thread-row-action",
                    renderIcon: (size) => icon(Clock3, size),
                    onClick: stopThen(() => void controller.threads.snooze(
                      thread.id,
                      presets()[0]?.until,
                    )),
                  })
                : null,
              canSettle
                ? controls.iconButton({
                    label: "Settle thread",
                    variant: "compact",
                    className: "thread-row-action",
                    renderIcon: (size) => icon(Check, size),
                    onClick: stopThen(() => void controller.threads.settle(thread.id, true)),
                  })
                : null,
            )
          : null,
      ),
    ),
    span({ class: "thread-title" }, thread.title),
    div(
      { class: "thread-meta" },
      span(modelLabel(state, thread)),
      providerIcon(findProvider(state.providers.get(), thread.provider), 12),
    ),
  );
}

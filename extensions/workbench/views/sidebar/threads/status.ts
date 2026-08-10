import {
  isThreadSettled,
  isThreadWoke,
  snoozeWakeLabel,
  threadLastActivityAt,
  threadStatus,
  type AgentThreadSummary,
  type ThreadStatus,
} from "@sand/extension-api";

import { findModel, modelName } from "../../../modelCatalog.ts";
import type { WorkbenchState } from "../../../state.ts";
import { relativeTime, workingDuration } from "../../format.ts";

export function modelLabel(state: WorkbenchState, thread: AgentThreadSummary): string {
  return modelName(
    findModel(state.providerModels.get(), thread.provider, thread.model),
    thread.model,
  );
}

export function rowLabel(thread: AgentThreadSummary, now: number): string {
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

export function previewLabel(
  thread: AgentThreadSummary,
  autoSettleAfterDays: number | null,
): string {
  const now = Date.now();
  if (isThreadWoke(thread, now)) return "Woke";
  if (thread.snoozedUntil && Date.parse(thread.snoozedUntil) > now) {
    return `Snoozed, ${snoozeWakeLabel(thread.snoozedUntil, now)}`;
  }
  if (isThreadSettled(thread, { now, autoSettleAfterDays })) return "Settled";
  const status = threadStatus(thread);
  return status === "ready" ? "Ready" : statusLabel(status);
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

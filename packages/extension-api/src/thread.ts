export type AgentSessionStatus = "idle" | "running" | "complete" | "error" | "cancelled";
export type ThreadSettlementOverride = "settled" | "active";
export type ThreadChangeRequestState = "open" | "closed" | "merged";
export type ThreadBackgroundStatus = "working" | "monitoring";
export type ThreadSection = "pinned" | "active" | "snoozed" | "settled";
export type ThreadStatus =
  | "approval"
  | "input"
  | "working"
  | "monitoring"
  | "failed"
  | "ready";

export interface ThreadLifecycleSummary {
  status: AgentSessionStatus;
  pinned: boolean;
  unread: boolean;
  createdAt: string;
  updatedAt: string;
  statusChangedAt?: string;
  latestUserMessageAt?: string;
  latestTurnStartedAt?: string;
  latestTurnCompletedAt?: string;
  settledOverride?: ThreadSettlementOverride;
  settledAt?: string;
  snoozedAt?: string;
  snoozedUntil?: string;
  pinnedAt?: string;
  pinOrderKey?: string;
  lastVisitedAt?: string;
  wakeAcknowledgedAt?: string;
  hasPendingApprovals?: boolean;
  hasPendingUserInput?: boolean;
  backgroundStatus?: ThreadBackgroundStatus;
  changeRequestState?: ThreadChangeRequestState;
  changeRequestChangedAt?: string;
}

export interface ThreadLifecycleOptions {
  now: number;
  autoSettleAfterDays: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1_000;
const HOUR_MS = 60 * 60 * 1_000;
const QUEUED_TURN_GRACE_MS = 2 * 60 * 1_000;

export function threadLastActivityAt(thread: ThreadLifecycleSummary): string {
  return latestTime(
    thread.latestUserMessageAt,
    thread.latestTurnStartedAt,
    thread.latestTurnCompletedAt,
    thread.createdAt,
  ) ?? thread.updatedAt;
}

export function hasQueuedTurn(thread: ThreadLifecycleSummary, now: number): boolean {
  const messageAt = time(thread.latestUserMessageAt);
  if (messageAt === null || thread.status === "error") return false;
  if (Math.abs(now - messageAt) > QUEUED_TURN_GRACE_MS) return false;
  const turnAt = time(thread.latestTurnStartedAt);
  return turnAt === null || turnAt < messageAt;
}

export function canSettleThread(thread: ThreadLifecycleSummary, now: number): boolean {
  if (thread.hasPendingApprovals || thread.hasPendingUserInput) return false;
  if (thread.status === "running") return false;
  return !hasQueuedTurn(thread, now);
}

export function canSnoozeThread(thread: ThreadLifecycleSummary, now: number): boolean {
  if (thread.hasPendingApprovals || thread.hasPendingUserInput) return false;
  return !hasQueuedTurn(thread, now);
}

export function threadRaisedHandWhileSnoozed(thread: ThreadLifecycleSummary): boolean {
  if (thread.hasPendingApprovals || thread.hasPendingUserInput) return true;
  const snoozedAt = time(thread.snoozedAt);
  if (snoozedAt === null) return false;
  if (thread.status === "error" && newer(thread.statusChangedAt, snoozedAt)) return true;
  if (
    (thread.changeRequestState === "merged" || thread.changeRequestState === "closed")
    && newer(thread.changeRequestChangedAt, snoozedAt)
  ) return true;
  return newer(thread.latestTurnCompletedAt, snoozedAt);
}

export function isThreadSnoozed(thread: ThreadLifecycleSummary, now: number): boolean {
  const wakeAt = time(thread.snoozedUntil);
  return wakeAt !== null && wakeAt > now && !threadRaisedHandWhileSnoozed(thread);
}

export function threadWokeAt(thread: ThreadLifecycleSummary, now: number): string | null {
  const wakeAt = time(thread.snoozedUntil);
  if (wakeAt === null || !thread.snoozedUntil) return null;
  if (threadRaisedHandWhileSnoozed(thread)) {
    return latestTime(
      thread.latestTurnCompletedAt,
      thread.changeRequestChangedAt,
      thread.statusChangedAt,
      thread.snoozedAt,
    );
  }
  return wakeAt <= now ? thread.snoozedUntil : null;
}

export function isThreadWoke(thread: ThreadLifecycleSummary, now: number): boolean {
  const wokeAt = time(threadWokeAt(thread, now));
  if (wokeAt === null) return false;
  const acknowledgedAt = Math.max(
    time(thread.wakeAcknowledgedAt) ?? Number.NEGATIVE_INFINITY,
    time(thread.lastVisitedAt) ?? Number.NEGATIVE_INFINITY,
  );
  return wokeAt > acknowledgedAt;
}

export function isThreadSettled(
  thread: ThreadLifecycleSummary,
  options: ThreadLifecycleOptions,
): boolean {
  if (!canSettleThread(thread, options.now)) return false;
  if (thread.settledOverride === "settled") return true;
  if (thread.settledOverride === "active") return false;
  if (thread.changeRequestState === "merged" || thread.changeRequestState === "closed") {
    return true;
  }
  if (thread.changeRequestState === "open" || options.autoSettleAfterDays === null) {
    return false;
  }
  const lastActivity = time(threadLastActivityAt(thread));
  return lastActivity !== null
    && lastActivity < options.now - options.autoSettleAfterDays * DAY_MS;
}

export function threadSection(
  thread: ThreadLifecycleSummary,
  options: ThreadLifecycleOptions,
): ThreadSection {
  if (isThreadSnoozed(thread, options.now)) return "snoozed";
  if (thread.pinned) return "pinned";
  return isThreadSettled(thread, options) ? "settled" : "active";
}

export function threadStatus(thread: ThreadLifecycleSummary): ThreadStatus {
  if (thread.hasPendingApprovals) return "approval";
  if (thread.hasPendingUserInput) return "input";
  if (thread.status === "running" || thread.backgroundStatus === "working") return "working";
  if (thread.status === "error") return "failed";
  if (thread.backgroundStatus === "monitoring") return "monitoring";
  return "ready";
}

export function settledTimestamp(thread: ThreadLifecycleSummary): string {
  return thread.settledAt ?? threadLastActivityAt(thread);
}

export function compareActiveThreads(left: ThreadLifecycleSummary, right: ThreadLifecycleSummary): number {
  return compareDescending(left.createdAt, right.createdAt);
}

export function comparePinnedThreads(left: ThreadLifecycleSummary, right: ThreadLifecycleSummary): number {
  const leftKey = left.pinOrderKey;
  const rightKey = right.pinOrderKey;
  if (leftKey && rightKey && leftKey !== rightKey) return leftKey.localeCompare(rightKey);
  if (leftKey) return -1;
  if (rightKey) return 1;
  return compareActiveThreads(left, right);
}

export function compareSnoozedThreads(left: ThreadLifecycleSummary, right: ThreadLifecycleSummary): number {
  return (time(left.snoozedUntil) ?? Number.POSITIVE_INFINITY)
    - (time(right.snoozedUntil) ?? Number.POSITIVE_INFINITY);
}

export function compareSettledThreads(left: ThreadLifecycleSummary, right: ThreadLifecycleSummary): number {
  return compareDescending(settledTimestamp(left), settledTimestamp(right));
}

export function snoozeWakeLabel(until: string, now: number): string {
  const wakeAt = time(until);
  if (wakeAt === null || wakeAt <= now) return "now";
  const remaining = wakeAt - now;
  if (remaining < HOUR_MS) return `${Math.max(1, Math.ceil(remaining / 60_000))}m`;
  if (remaining < DAY_MS) return `${Math.ceil(remaining / HOUR_MS)}h`;
  return `${Math.ceil(remaining / DAY_MS)}d`;
}

function compareDescending(left: string, right: string): number {
  return (time(right) ?? 0) - (time(left) ?? 0);
}

function newer(value: string | undefined, baseline: number): boolean {
  const valueAt = time(value);
  return valueAt !== null && valueAt > baseline;
}

function latestTime(...values: (string | undefined)[]): string | null {
  let latest: string | null = null;
  let latestAt = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    const valueAt = time(value);
    if (value && valueAt !== null && valueAt > latestAt) {
      latest = value;
      latestAt = valueAt;
    }
  }
  return latest;
}

function time(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

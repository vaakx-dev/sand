import { describe, expect, test } from "bun:test";

import {
  canSnoozeThread,
  isThreadSnoozed,
  isThreadWoke,
  type AgentSessionSummary,
} from "@sand/extension-api";

import { groupThreads } from "../extensions/workbench/views/sidebar/threadGroups.ts";

describe("thread shelves", () => {
  test("keeps snoozed threads in their own shelf", () => {
    const now = Date.parse("2026-08-10T12:00:00.000Z");
    const groups = groupThreads([
      session("active", "idle"),
      session("pinned", "idle", { pinned: true }),
      session("settled", "complete", { settledOverride: "settled" }),
      session("snoozed", "complete", {
        pinned: true,
        snoozedUntil: "2026-08-10T14:00:00.000Z",
      }),
    ], { query: "", now, autoSettleAfterDays: 3 });

    expect(groups.active.map((item) => item.id)).toEqual(["active"]);
    expect(groups.pinned.map((item) => item.id)).toEqual(["pinned"]);
    expect(groups.settled.map((item) => item.id)).toEqual(["settled"]);
    expect(groups.snoozed.map((item) => item.id)).toEqual(["snoozed"]);
  });

  test("returns expired snoozes to their normal shelf", () => {
    const groups = groupThreads([
      session("expired-active", "idle", { snoozedUntil: "2026-08-10T11:00:00.000Z" }),
      session("expired-settled", "complete", {
        settledOverride: "settled",
        snoozedUntil: "2026-08-10T11:00:00.000Z",
      }),
    ], {
      query: "",
      now: Date.parse("2026-08-10T12:00:00.000Z"),
      autoSettleAfterDays: 3,
    });

    expect(groups.snoozed).toHaveLength(0);
    expect(groups.active.map((item) => item.id)).toEqual(["expired-active"]);
    expect(groups.settled.map((item) => item.id)).toEqual(["expired-settled"]);
  });

  test("keeps completed work active until lifecycle rules settle it", () => {
    const now = Date.parse("2026-08-10T12:00:00.000Z");
    const groups = groupThreads([
      session("ready", "complete", { createdAt: "2026-08-10T10:00:00.000Z" }),
      session("quiet", "complete", { createdAt: "2026-08-01T10:00:00.000Z" }),
    ], { query: "", now, autoSettleAfterDays: 3 });

    expect(groups.active.map((item) => item.id)).toEqual(["ready"]);
    expect(groups.settled.map((item) => item.id)).toEqual(["quiet"]);
  });

  test("allows background work to snooze and wakes it when the turn completes", () => {
    const snoozedAt = "2026-08-10T10:00:00.000Z";
    const now = Date.parse("2026-08-10T11:00:00.000Z");
    const running = session("running", "running", {
      snoozedAt,
      snoozedUntil: "2026-08-10T14:00:00.000Z",
    });
    expect(canSnoozeThread(running, now)).toBe(true);
    expect(isThreadSnoozed(running, now)).toBe(true);

    const completed = {
      ...running,
      status: "complete" as const,
      latestTurnCompletedAt: "2026-08-10T10:30:00.000Z",
    };
    expect(isThreadSnoozed(completed, now)).toBe(false);
    expect(isThreadWoke(completed, now)).toBe(true);
  });
});

function session(
  id: string,
  status: AgentSessionSummary["status"],
  values: Partial<AgentSessionSummary> = {},
): AgentSessionSummary {
  return {
    id,
    title: id,
    provider: "chatgpt",
    model: "gpt-5.6-sol",
    status,
    pinned: false,
    unread: false,
    createdAt: "2026-08-10T10:00:00.000Z",
    updatedAt: "2026-08-10T10:00:00.000Z",
    ...values,
  };
}

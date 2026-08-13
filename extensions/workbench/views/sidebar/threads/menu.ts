import { div, dynamicChild } from "@vaakx-dev/vrui";

import {
  canSettleThread,
  canSnoozeThread,
  comparePinnedThreads,
  isThreadSettled,
  isThreadSnoozed,
  type AgentThreadSummary,
} from "@sand/extension-api";

import type { MenuEntry, SandUi } from "sand:api/ui";
import type { WorkbenchController } from "../../../controller.ts";
import type { WorkbenchState } from "../../../state.ts";
import { presets } from "./snooze.ts";

export function contextMenu(
  controller: WorkbenchController,
  state: WorkbenchState,
  ui: SandUi,
): HTMLElement {
  return dynamicChild(state.threads.menu, (menu) => menu
    ? ui.contextMenu({
        x: menu.x,
        y: menu.y,
        ...(menu.kind === "snooze" ? { width: 192 } : {}),
        items: menu.kind === "snooze"
          ? snoozeEntries(controller, menu.thread)
          : entries(controller, state, menu.thread),
        onDismiss: () => close(state),
      })
    : div({ hidden: true }));
}

function snoozeEntries(
  controller: WorkbenchController,
  thread: AgentThreadSummary,
): MenuEntry[] {
  return presets().map((preset) => action(
    preset.label,
    () => controller.threads.snooze(thread.id, preset.until),
  ));
}

function entries(
  controller: WorkbenchController,
  state: WorkbenchState,
  thread: AgentThreadSummary,
): MenuEntry[] {
  const now = Date.now();
  const snoozed = isThreadSnoozed(thread, now);
  const settled = isThreadSettled(thread, {
    now,
    autoSettleAfterDays: state.threads.autoSettleDays.get(),
  });
  const pins = state.threads.items.get().filter((item) => item.pinned).sort(comparePinnedThreads);
  const pinIndex = pins.findIndex((item) => item.id === thread.id);
  return compact([
    action(
      thread.pinned ? "Unpin thread" : "Pin thread",
      () => controller.threads.pin(thread.id, !thread.pinned),
    ),
    pinIndex > 0
      ? action("Move pinned thread up", () => controller.threads.movePin(thread.id, "up"))
      : null,
    pinIndex >= 0 && pinIndex < pins.length - 1
      ? action("Move pinned thread down", () => controller.threads.movePin(thread.id, "down"))
      : null,
    canSettleThread(thread, now)
      ? action(
          settled ? "Un-settle thread" : "Settle thread",
          () => controller.threads.settle(thread.id, !settled),
        )
      : null,
    snoozed
      ? action("Wake thread", () => controller.threads.snooze(thread.id))
      : canSnoozeThread(thread, now)
        ? {
            label: "Snooze",
            children: presets().map((preset) => action(
              preset.label,
              () => controller.threads.snooze(thread.id, preset.until),
            )),
          }
        : null,
    {
      label: "Rename thread",
      run: () => controller.threads.beginRename(thread),
    },
    action(
      thread.unread ? "Mark read" : "Mark unread",
      () => controller.threads.setUnread(thread.id, !thread.unread),
    ),
    { separator: true },
    thread.status === "running"
      ? null
      : {
          ...action("Delete", () => controller.threads.delete(thread.id)),
          tone: "danger",
        },
  ]);
}

function action(label: string, run: () => Promise<void>): MenuEntry {
  return { label, run };
}

function compact(entries: (MenuEntry | null)[]): MenuEntry[] {
  return entries.filter((entry): entry is MenuEntry => entry !== null);
}

function close(state: WorkbenchState): void {
  state.threads.menu.set(null);
}

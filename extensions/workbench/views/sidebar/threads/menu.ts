import { button, div, dynamicChild, icon, span, stop } from "@vaakx-dev/vrui";
import { ChevronRight } from "lucide";

import {
  canSettleThread,
  canSnoozeThread,
  comparePinnedThreads,
  isThreadSettled,
  isThreadSnoozed,
  type AgentThreadSummary,
} from "@sand/extension-api";

import type { WorkbenchController } from "../../../controller.ts";
import type { WorkbenchState } from "../../../state.ts";
import { presets } from "./snooze.ts";

export function contextMenu(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  return dynamicChild(state.threads.menu, (menu) => menu
    ? menuView(controller, state, menu.thread, menu.x, menu.y)
    : div({ hidden: true }));
}

function menuView(
  controller: WorkbenchController,
  state: WorkbenchState,
  thread: AgentThreadSummary,
  x: number,
  y: number,
): HTMLElement {
  const now = Date.now();
  const snoozed = isThreadSnoozed(thread, now);
  const settled = isThreadSettled(thread, {
    now,
    autoSettleAfterDays: state.threads.autoSettleDays.get(),
  });
  const pins = state.threads.items.get().filter((item) => item.pinned).sort(comparePinnedThreads);
  const pinIndex = pins.findIndex((item) => item.id === thread.id);
  return div(
    {
      class: "thread-menu-layer",
      onPointerDown: () => close(state),
      onContextMenu: (event) => event.preventDefault(),
    },
    div(
      {
        class: "thread-menu",
        style: {
          left: `${Math.max(6, Math.min(x, window.innerWidth - 370))}px`,
          top: `${Math.max(6, Math.min(y, window.innerHeight - 250))}px`,
        },
        onPointerDown: stop,
        onPointerLeave: () => state.threads.snoozeOpen.set(false),
      },
      menuButton(
        thread.pinned ? "Unpin thread" : "Pin thread",
        () => run(state, controller.threads.pin(thread.id, !thread.pinned)),
      ),
      pinIndex > 0
        ? menuButton("Move pinned thread up", () => run(state, controller.threads.movePin(thread.id, "up")))
        : null,
      pinIndex >= 0 && pinIndex < pins.length - 1
        ? menuButton("Move pinned thread down", () => run(state, controller.threads.movePin(thread.id, "down")))
        : null,
      canSettleThread(thread, now)
        ? menuButton(settled ? "Un-settle thread" : "Settle thread", () =>
            run(state, controller.threads.settle(thread.id, !settled)))
        : null,
      snoozed
        ? menuButton("Wake thread", () => run(state, controller.threads.snooze(thread.id)))
        : canSnoozeThread(thread, now)
          ? snoozeControl(controller, state, thread)
          : null,
      menuButton("Rename thread", () => {
        close(state);
        controller.threads.beginRename(thread);
      }),
      menuButton(thread.unread ? "Mark read" : "Mark unread", () =>
        run(state, controller.threads.setUnread(thread.id, !thread.unread))),
      div({ class: "thread-menu-divider" }),
      thread.status === "running"
        ? null
        : menuButton(
            "Delete",
            () => run(state, controller.threads.delete(thread.id)),
            "danger",
          ),
    ),
  );
}

function snoozeControl(
  controller: WorkbenchController,
  state: WorkbenchState,
  thread: AgentThreadSummary,
): HTMLElement {
  return div(
    {
      class: "thread-snooze-wrap",
      onPointerEnter: () => state.threads.snoozeOpen.set(true),
    },
    button(
      { class: "thread-menu-row", onClick: () => state.threads.snoozeOpen.toggle()() },
      span("Snooze"),
      icon(ChevronRight, 13),
    ),
    dynamicChild(state.threads.snoozeOpen, (open) => open
      ? div(
          { class: "thread-snooze-menu" },
          ...presets().map((preset) => menuButton(
            preset.label,
            () => run(state, controller.threads.snooze(thread.id, preset.until)),
          )),
        )
      : div({ hidden: true })),
  );
}

function menuButton(
  label: string,
  runAction: () => void,
  tone = "",
): HTMLElement {
  return button({ class: ["thread-menu-row", tone], onClick: runAction }, span(label));
}

function run(state: WorkbenchState, action: Promise<void>): void {
  close(state);
  void action;
}

function close(state: WorkbenchState): void {
  state.threads.menu.set(null);
  state.threads.snoozeOpen.set(false);
}

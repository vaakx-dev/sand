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

import type { WorkbenchController } from "../../controller.ts";
import type { WorkbenchState } from "../../state.ts";
import { snoozePresets } from "./snoozePresets.ts";

export function threadContextMenu(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  return dynamicChild(state.threadMenu, (menu) => menu
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
    autoSettleAfterDays: state.autoSettleDays.get(),
  });
  const pins = state.threads.get().filter((item) => item.pinned).sort(comparePinnedThreads);
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
        onPointerLeave: () => state.threadSnoozeOpen.set(false),
      },
      menuButton(
        thread.pinned ? "Unpin thread" : "Pin thread",
        () => run(state, controller.agent.pinThread(thread.id, !thread.pinned)),
      ),
      pinIndex > 0
        ? menuButton("Move pinned thread up", () => run(state, controller.agent.movePin(thread.id, "up")))
        : null,
      pinIndex >= 0 && pinIndex < pins.length - 1
        ? menuButton("Move pinned thread down", () => run(state, controller.agent.movePin(thread.id, "down")))
        : null,
      canSettleThread(thread, now)
        ? menuButton(settled ? "Un-settle thread" : "Settle thread", () =>
            run(state, controller.agent.settleThread(thread.id, !settled)))
        : null,
      snoozed
        ? menuButton("Wake thread", () => run(state, controller.agent.snoozeThread(thread.id)))
        : canSnoozeThread(thread, now)
          ? snoozeControl(controller, state, thread)
          : null,
      menuButton("Rename thread", () => {
        close(state);
        controller.agent.beginRename(thread);
      }),
      menuButton(thread.unread ? "Mark read" : "Mark unread", () =>
        run(state, controller.agent.setUnread(thread.id, !thread.unread))),
      div({ class: "thread-menu-divider" }),
      thread.status === "running"
        ? null
        : menuButton(
            "Delete",
            () => run(state, controller.agent.deleteThread(thread.id)),
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
      onPointerEnter: () => state.threadSnoozeOpen.set(true),
    },
    button(
      { class: "thread-menu-row", onClick: () => state.threadSnoozeOpen.toggle()() },
      span("Snooze"),
      icon(ChevronRight, 13),
    ),
    dynamicChild(state.threadSnoozeOpen, (open) => open
      ? div(
          { class: "thread-snooze-menu" },
          ...snoozePresets().map((preset) => menuButton(
            preset.label,
            () => run(state, controller.agent.snoozeThread(thread.id, preset.until)),
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
  state.threadMenu.set(null);
  state.threadSnoozeOpen.set(false);
}

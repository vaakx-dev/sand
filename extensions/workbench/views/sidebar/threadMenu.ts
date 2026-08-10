import { button, div, dynamicChild, icon, span, stop } from "@vaakx-dev/vrui";
import { ChevronRight } from "lucide";

import {
  canSettleThread,
  canSnoozeThread,
  comparePinnedThreads,
  isThreadSettled,
  isThreadSnoozed,
  type AgentSessionSummary,
} from "@sand/extension-api";

import type { WorkbenchController } from "../../controller.ts";
import type { WorkbenchState } from "../../state.ts";
import { snoozePresets } from "./snoozePresets.ts";

export function threadContextMenu(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  return dynamicChild(state.threadMenu, (menu) => menu
    ? menuView(controller, state, menu.session, menu.x, menu.y)
    : div({ hidden: true }));
}

function menuView(
  controller: WorkbenchController,
  state: WorkbenchState,
  session: AgentSessionSummary,
  x: number,
  y: number,
): HTMLElement {
  const now = Date.now();
  const snoozed = isThreadSnoozed(session, now);
  const settled = isThreadSettled(session, {
    now,
    autoSettleAfterDays: state.autoSettleDays.get(),
  });
  const pins = state.sessions.get().filter((item) => item.pinned).sort(comparePinnedThreads);
  const pinIndex = pins.findIndex((item) => item.id === session.id);
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
        session.pinned ? "Unpin thread" : "Pin thread",
        () => run(state, controller.agent.pinSession(session.id, !session.pinned)),
      ),
      pinIndex > 0
        ? menuButton("Move pinned thread up", () => run(state, controller.agent.movePin(session.id, "up")))
        : null,
      pinIndex >= 0 && pinIndex < pins.length - 1
        ? menuButton("Move pinned thread down", () => run(state, controller.agent.movePin(session.id, "down")))
        : null,
      canSettleThread(session, now)
        ? menuButton(settled ? "Un-settle thread" : "Settle thread", () =>
            run(state, controller.agent.settleSession(session.id, !settled)))
        : null,
      snoozed
        ? menuButton("Wake thread", () => run(state, controller.agent.snoozeSession(session.id)))
        : canSnoozeThread(session, now)
          ? snoozeControl(controller, state, session)
          : null,
      menuButton("Rename thread", () => {
        close(state);
        controller.agent.beginRename(session);
      }),
      menuButton(session.unread ? "Mark read" : "Mark unread", () =>
        run(state, controller.agent.setUnread(session.id, !session.unread))),
      div({ class: "thread-menu-divider" }),
      session.status === "running"
        ? null
        : menuButton(
            "Delete",
            () => run(state, controller.agent.deleteSession(session.id)),
            "danger",
          ),
    ),
  );
}

function snoozeControl(
  controller: WorkbenchController,
  state: WorkbenchState,
  session: AgentSessionSummary,
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
            () => run(state, controller.agent.snoozeSession(session.id, preset.until)),
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

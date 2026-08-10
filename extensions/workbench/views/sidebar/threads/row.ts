import { div, type Sig } from "@vaakx-dev/vrui";

import {
  comparePinnedThreads,
  isThreadWoke,
  type AgentThreadSummary,
  type ThreadSection,
  type UiControls,
} from "@sand/extension-api";

import type { WorkbenchController } from "../../../controller.ts";
import type { WorkbenchState } from "../../../state.ts";
import { fullContent, slimContent } from "./content.ts";

export function row(
  controller: WorkbenchController,
  state: WorkbenchState,
  controls: UiControls,
  clock: Sig<number>,
  thread: AgentThreadSummary,
  section: ThreadSection,
): HTMLElement {
  const slim = section === "snoozed" || section === "settled";
  const open = () => void controller.threads.open(thread.id);
  return div(
    {
      class: ["thread-card", section, {
        active: state.threads.current.map((id) => id === thread.id),
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
      onDrop: (event) => dropPin(event, controller, state, thread, section),
      onMouseEnter: (event) => {
        const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
        state.threads.previewTop.set(Math.max(8, Math.min(bounds.top, window.innerHeight - 126)));
        state.threads.preview.set(thread);
      },
      onMouseLeave: () => {
        if (state.threads.preview.get()?.id === thread.id) state.threads.preview.set(null);
      },
      onContextMenu: (event) => {
        event.preventDefault();
        state.threads.preview.set(null);
        state.threads.menu.set({ thread, x: event.clientX, y: event.clientY });
      },
      onKeyDown: (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        open();
      },
    },
    slim
      ? slimContent(controller, controls, thread, section, clock)
      : fullContent(controller, state, controls, thread, section, clock),
  );
}

function dropPin(
  event: DragEvent,
  controller: WorkbenchController,
  state: WorkbenchState,
  thread: AgentThreadSummary,
  section: ThreadSection,
): void {
  if (section !== "pinned") return;
  event.preventDefault();
  const source = event.dataTransfer?.getData("application/x-sand-thread");
  if (!source || source === thread.id) return;
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const pins = state.threads.items.get().filter((item) => item.pinned).sort(comparePinnedThreads);
  const targetIndex = pins.findIndex((item) => item.id === thread.id);
  const beforeId = event.clientY < bounds.top + bounds.height / 2
    ? thread.id
    : pins[targetIndex + 1]?.id;
  void controller.threads.reorderPin(source, beforeId);
}

import { div, type Sig } from "@vaakx-dev/vrui";

import { comparePinnedThreads, isThreadWoke, type AgentThreadSummary, type ThreadSection } from "@sand/extension-api";
import type { SandUi } from "sand:api/ui";
import { styled } from "sand:api/ui";
import type { WorkbenchController } from "../../../controller.ts";
import type { WorkbenchState } from "../../../state.ts";
import { fullContent, slimContent } from "./content.ts";

const Thread = styled(div, {
  position: "relative",
  minWidth: 0,
  overflow: "hidden",
  padding: "var(--space-medium)",
  borderRadius: "var(--row-radius)",
  color: "var(--muted)",
  background: "transparent",
  cursor: "pointer",
  "&[draggable=true]": { cursor: "grab" },
  "&[draggable=true]:active": { cursor: "grabbing" },
  "&:hover, &:focus-within, &[data-menu-open=true]": {
    color: "var(--text)",
    background: "var(--surface)",
  },
  "&[aria-selected=true]": { color: "var(--text)", background: "var(--elevated)" },
  "&[aria-selected=true] [data-role=actions]": { background: "var(--elevated)" },
  "&[data-woke=true] [data-role=status]": { color: "var(--warning)" },
  "&:hover [data-role=status][data-actionable=true], &:focus-within [data-role=status][data-actionable=true], &[data-menu-open=true] [data-role=status][data-actionable=true]": { display: "none" },
  "&:hover [data-role=actions], &:focus-within [data-role=actions], &[data-menu-open=true] [data-role=actions]": { display: "flex" },
  "&[data-slim=true]:hover [data-role=time], &[data-slim=true]:focus-within [data-role=time], &[data-slim=true][data-menu-open=true] [data-role=time]": { display: "none" },
  "&[data-unread=true] [data-role=title]": { fontWeight: "var(--weight-bold)" },
  "&[data-unread=true] [data-role=title]::before": { content: '""', width: "var(--indicator-size)", height: "var(--indicator-size)", display: "inline-block", margin: "0 var(--space-small) 0 0", borderRadius: "var(--radius-round)", background: "var(--accent)" },
});

export function row(
  controller: WorkbenchController,
  state: WorkbenchState,
  ui: SandUi,
  clock: Sig<number>,
  thread: AgentThreadSummary,
  section: ThreadSection,
): HTMLElement {
  const slim = section === "snoozed" || section === "settled";
  const open = () => void controller.threads.open(thread.id);
  return Thread(
    {
      role: "button",
      tabIndex: 0,
      "aria-selected": state.threads.current.map((id) => id === thread.id),
      "data-unread": thread.unread,
      "data-woke": clock.map((now) => isThreadWoke(thread, now)),
      "data-slim": slim,
      "data-menu-open": state.threads.menu.map((menu) => menu?.thread.id === thread.id),
      draggable: section === "pinned",
      onClick: open,
      onDragStart: (event) => {
        if (section !== "pinned") return;
        event.dataTransfer?.setData("application/x-sand-thread", thread.id);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
      },
      onDragOver: (event) => { if (section === "pinned") event.preventDefault(); },
      onDrop: (event) => dropPin(event, controller, state, thread, section),
      onMouseEnter: (event) => {
        const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
        state.threads.previewTop.set(Math.max(ui.tokens.space.medium, bounds.top));
        state.threads.preview.set(thread);
      },
      onMouseLeave: () => {
        if (state.threads.preview.get()?.id === thread.id) state.threads.preview.set(null);
      },
      onContextMenu: (event) => {
        event.preventDefault();
        state.threads.preview.set(null);
        state.threads.menu.set({
          kind: "thread",
          thread,
          x: event.clientX,
          y: event.clientY,
        });
      },
      onKeyDown: (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        open();
      },
    },
    slim
      ? slimContent(controller, ui, thread, section, clock)
      : fullContent(controller, state, ui, thread, section, clock),
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
  const beforeId = event.clientY < bounds.top + bounds.height / 2 ? thread.id : pins[targetIndex + 1]?.id;
  void controller.threads.reorderPin(source, beforeId);
}

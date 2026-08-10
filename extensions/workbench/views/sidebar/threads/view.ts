import {
  button,
  derive,
  div,
  icon,
  input,
  list,
  onInterval,
  show,
  sig,
  span,
} from "@vaakx-dev/vrui";
import { Plus, Search, SquarePen, X } from "lucide";

import type { AgentThreadSummary, UiControls, UiSlotRegistry } from "@sand/extension-api";

import type { WorkbenchController } from "../../../controller.ts";
import { workbenchCommands, workbenchSlots } from "../../../api.ts";
import type { WorkbenchState } from "../../../state.ts";
import { uiSlot } from "../../shared/slot.ts";
import { group } from "./groups.ts";
import { row } from "./row.ts";
import { shelf } from "./shelf.ts";

export function view(
  controller: WorkbenchController,
  state: WorkbenchState,
  slots: UiSlotRegistry,
  controls: UiControls,
): HTMLElement {
  const clock = sig(Date.now());
  const groups = derive(() => group(
    state.threads.items.get(),
    {
      query: state.threads.query.get(),
      now: clock.get(),
      autoSettleAfterDays: state.threads.autoSettleDays.get(),
    },
  ));
  const pinned = groups.map((value) => value.pinned);
  const active = groups.map((value) => value.active);
  const snoozed = groups.map((value) => value.snoozed);
  const settled = groups.map((value) => value.settled);
  const visibleSnoozed = derive(() => visibleShelf(
    snoozed.get(),
    state.threads.snoozedOpen.get(),
    state.threads.current.get(),
  ));
  const visibleSettled = derive(() => {
    return visibleShelf(
      settled.get(),
      state.threads.settledOpen.get(),
      state.threads.current.get(),
      state.threads.settledLimit.get(),
    );
  });
  const hiddenSettled = derive(() => Math.max(
    0,
    settled.get().length - state.threads.settledLimit.get(),
  ));

  return div(
    { class: "sidebar-view", onMount: () => onInterval(() => clock.set(Date.now()), 1_000) },
    tools(controller, state, slots, controls),
    div(
      { class: "thread-scroll" },
      list(
        pinned,
        (thread) => thread.id,
        (thread) => row(controller, state, controls, clock, thread.get(), "pinned"),
        div({ class: "thread-section pinned" }),
      ),
      show(pinned.map((threads) => threads.length > 0), () => div({ class: "thread-divider" })),
      list(
        active,
        (thread) => thread.id,
        (thread) => row(controller, state, controls, clock, thread.get(), "active"),
        div({ class: "thread-section" }),
      ),
      show(snoozed.map((threads) => threads.length > 0), () => shelf(
        controller,
        state,
        controls,
        clock,
        {
          label: "Snoozed",
          className: "snoozed",
          section: "snoozed",
          open: state.threads.snoozedOpen,
          threads: visibleSnoozed,
          total: snoozed.map((threads) => threads.length),
        },
      )),
      show(settled.map((threads) => threads.length > 0), () => shelf(
        controller,
        state,
        controls,
        clock,
        {
          label: "Settled",
          className: "settled",
          section: "settled",
          open: state.threads.settledOpen,
          threads: visibleSettled,
          total: settled.map((threads) => threads.length),
          hidden: hiddenSettled,
          pageSize: 25,
          showMore: () => state.threads.settledLimit.update((value) => value + 25),
        },
      )),
      show(groups.map((value) => value.matching.length === 0), () => div(
        { class: "sidebar-empty" },
        span(state.threads.query.map((query) => query ? "No threads found" : "No threads yet")),
        button(
          {
            class: "secondary-button",
            onClick: () => void controller.executeCommand(workbenchCommands.newThread),
          },
          icon(Plus, 12),
          "New thread",
        ),
      )),
    ),
  );
}

function tools(
  controller: WorkbenchController,
  state: WorkbenchState,
  slots: UiSlotRegistry,
  controls: UiControls,
): HTMLElement {
  return div(
    { class: "thread-tools" },
    div(
      { class: "thread-search" },
      icon(Search, 14),
      input({
        class: "thread-search-input",
        type: "search",
        bindValue: state.threads.query,
        placeholder: "Search",
        "aria-label": "Search threads",
      }),
      show(state.threads.query.map(Boolean), () => controls.iconButton({
        label: "Clear search",
        variant: "compact",
        className: "thread-search-clear",
        renderIcon: (size) => icon(X, size),
        onClick: () => state.threads.query.set(""),
      })),
    ),
    controls.iconButton({
      label: "New thread",
      renderIcon: (size) => icon(SquarePen, size),
      onClick: () => void controller.executeCommand(workbenchCommands.newThread),
    }),
    uiSlot(slots, workbenchSlots.sidebarProjects, "project-scope-slot"),
  );
}

function visibleShelf(
  threads: AgentThreadSummary[],
  open: boolean,
  selectedId: string | null,
  limit = threads.length,
): AgentThreadSummary[] {
  const selected = threads.find((thread) => thread.id === selectedId);
  if (!open) return selected ? [selected] : [];
  const visible = threads.slice(0, limit);
  return selected && !visible.some((thread) => thread.id === selected.id)
    ? [...visible, selected]
    : visible;
}

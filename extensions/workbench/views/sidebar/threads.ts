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
import { ChevronDown, FolderOpen, Plus, Search, SquarePen, X } from "lucide";

import type { AgentSessionSummary } from "@sand/extension-api";

import type { WorkbenchController } from "../../controller.ts";
import type { WorkbenchState } from "../../state.ts";
import { projectMenu } from "./projectMenu.ts";
import { groupThreads } from "./threadGroups.ts";
import { sessionRow } from "./threadRow.ts";
import { threadShelf } from "./threadShelf.ts";

export function threadsView(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  const clock = sig(Date.now());
  const groups = derive(() => groupThreads(
    state.sessions.get(),
    {
      query: state.threadQuery.get(),
      now: clock.get(),
      autoSettleAfterDays: state.autoSettleDays.get(),
    },
  ));
  const pinned = groups.map((value) => value.pinned);
  const active = groups.map((value) => value.active);
  const snoozed = groups.map((value) => value.snoozed);
  const settled = groups.map((value) => value.settled);
  const visibleSnoozed = derive(() => visibleShelf(
    snoozed.get(),
    state.snoozedOpen.get(),
    state.sessionId.get(),
  ));
  const visibleSettled = derive(() => {
    return visibleShelf(
      settled.get(),
      state.settledOpen.get(),
      state.sessionId.get(),
      state.settledLimit.get(),
    );
  });
  const hiddenSettled = derive(() => Math.max(
    0,
    settled.get().length - state.settledLimit.get(),
  ));

  return div(
    { class: "sidebar-view", onMount: () => onInterval(() => clock.set(Date.now()), 1_000) },
    threadTools(controller, state),
    div(
      { class: "thread-scroll" },
      list(
        pinned,
        (session) => session.id,
        (session) => sessionRow(controller, state, clock, session.get(), "pinned"),
        div({ class: "thread-section pinned" }),
      ),
      show(pinned.map((sessions) => sessions.length > 0), () => div({ class: "thread-divider" })),
      list(
        active,
        (session) => session.id,
        (session) => sessionRow(controller, state, clock, session.get(), "active"),
        div({ class: "thread-section" }),
      ),
      show(snoozed.map((sessions) => sessions.length > 0), () => threadShelf(
        controller,
        state,
        clock,
        {
          label: "Snoozed",
          className: "snoozed",
          section: "snoozed",
          open: state.snoozedOpen,
          sessions: visibleSnoozed,
          total: snoozed.map((sessions) => sessions.length),
        },
      )),
      show(settled.map((sessions) => sessions.length > 0), () => threadShelf(
        controller,
        state,
        clock,
        {
          label: "Settled",
          className: "settled",
          section: "settled",
          open: state.settledOpen,
          sessions: visibleSettled,
          total: settled.map((sessions) => sessions.length),
          hidden: hiddenSettled,
          pageSize: 25,
          showMore: () => state.settledLimit.update((value) => value + 25),
        },
      )),
      show(groups.map((value) => value.matching.length === 0), () => div(
        { class: "sidebar-empty" },
        span(state.threadQuery.map((query) => query ? "No threads found" : "No threads yet")),
        button(
          { class: "secondary-button", onClick: () => controller.projects.openPicker("newThread") },
          icon(Plus, 12),
          "New thread",
        ),
      )),
    ),
  );
}

function threadTools(controller: WorkbenchController, state: WorkbenchState): HTMLElement {
  return div(
    { class: "thread-tools" },
    div(
      { class: "thread-search" },
      icon(Search, 14),
      input({
        class: "thread-search-input",
        type: "search",
        bindValue: state.threadQuery,
        placeholder: "Search",
        "aria-label": "Search threads",
      }),
      show(state.threadQuery.map(Boolean), () => button(
        {
          class: "thread-search-clear",
          "aria-label": "Clear search",
          "data-tooltip": "Clear search",
          onClick: () => state.threadQuery.set(""),
        },
        icon(X, 12),
      )),
    ),
    button(
      {
        class: "sidebar-menu-icon",
        "aria-label": "New thread",
        "data-tooltip": "New thread",
        onClick: () => controller.projects.openPicker("newThread"),
      },
      icon(SquarePen, 16),
    ),
    div(
      { class: "project-scope-row" },
      button(
        { class: "project-scope", onClick: state.projectMenuOpen.toggle() },
        icon(FolderOpen, 14),
        span({ class: "project-scope-name" }, "All projects"),
        icon(ChevronDown, 13),
      ),
      button(
        {
          class: "sidebar-menu-icon new-project-button",
          "aria-label": "New project",
          "data-tooltip": "New project",
          onClick: () => {
            state.projectMenuOpen.set(false);
            state.projectSourceView.set("sources");
            state.projectSourceIndex.set(0);
            state.projectSourceOpen.set(true);
          },
        },
        icon(Plus, 15),
      ),
    ),
    show(state.projectMenuOpen, () => projectMenu(controller, state)),
  );
}

function visibleShelf(
  sessions: AgentSessionSummary[],
  open: boolean,
  selectedId: string | null,
  limit = sessions.length,
): AgentSessionSummary[] {
  const selected = sessions.find((session) => session.id === selectedId);
  if (!open) return selected ? [selected] : [];
  const visible = sessions.slice(0, limit);
  return selected && !visible.some((session) => session.id === selected.id)
    ? [...visible, selected]
    : visible;
}

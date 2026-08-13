import {
  derive,
  div,
  icon,
  list,
  onInterval,
  show,
  sig,
  span,
} from "@vaakx-dev/vrui";
import { Plus, SquarePen } from "lucide";

import type { AgentThreadSummary } from "@sand/extension-api";
import type { SandUi } from "sand:api/ui";
import type { UiSlotRegistry } from "../../../api.ts";

import type { WorkbenchController } from "../../../controller.ts";
import { workbenchCommands, workbenchSlots } from "../../../api.ts";
import type { WorkbenchState } from "../../../state.ts";
import { group } from "./groups.ts";
import { row } from "./row.ts";
import { shelf } from "./shelf.ts";
import { styled } from "sand:api/ui";

const View = styled(div, { minWidth: 0, minHeight: 0, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" });
const Tools = styled(div, { position: "relative", zIndex: "var(--z-chrome)", flex: "0 0 auto", display: "grid", gridTemplateColumns: "minmax(0, 1fr) var(--control-height)", columnGap: "var(--space-compact)", rowGap: "var(--space-medium)", padding: "var(--space-medium)" });
const ProjectSlot = styled(div, { gridColumn: "1 / 3" });
const Scroll = styled(div, { minHeight: 0, flex: 1, padding: "0 var(--space-medium) var(--space-large)", overflow: "auto" });
const Section = styled(div, { display: "flex", flexDirection: "column", gap: "var(--space-compact)" });
const Divider = styled(div, { height: 1, margin: "var(--space-medium) 0", background: "var(--border)" });
const Empty = styled(div, {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "var(--space-large)",
  padding: "var(--space-page) var(--space-large)",
  color: "var(--muted)",
  textAlign: "center",
});

export function view(
  controller: WorkbenchController,
  state: WorkbenchState,
  slots: UiSlotRegistry,
  controls: SandUi,
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

  return View(
    { onMount: () => onInterval(() => clock.set(Date.now()), 1_000) },
    tools(controller, state, slots, controls),
    Scroll(
      {},
      list(
        pinned,
        (thread) => thread.id,
        (thread) => row(controller, state, controls, clock, thread.get(), "pinned"),
        Section({}),
      ),
      show(pinned.map((threads) => threads.length > 0), () => Divider({})),
      list(
        active,
        (thread) => thread.id,
        (thread) => row(controller, state, controls, clock, thread.get(), "active"),
        Section({}),
      ),
      show(snoozed.map((threads) => threads.length > 0), () => shelf(
        controller,
        state,
        controls,
        clock,
        {
          label: "Snoozed",
          accent: true,
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
          section: "settled",
          open: state.threads.settledOpen,
          threads: visibleSettled,
          total: settled.map((threads) => threads.length),
          hidden: hiddenSettled,
          pageSize: 25,
          showMore: () => state.threads.settledLimit.update((value) => value + 25),
        },
      )),
      show(groups.map((value) => value.matching.length === 0), () => Empty(
        {},
        span(state.threads.query.map((query) => query ? "No threads found" : "No threads yet")),
        controls.button(
          {
            onClick: () => void controller.executeCommand(workbenchCommands.newThread),
          },
          icon(Plus, controls.tokens.size.iconTiny),
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
  controls: SandUi,
): HTMLElement {
  return Tools(
    {},
    controls.searchField({ value: state.threads.query, label: "Search threads", placeholder: "Search" }),
    controls.iconButton({
      label: "New thread",
      renderIcon: (size) => icon(SquarePen, size),
      onClick: () => void controller.executeCommand(workbenchCommands.newThread),
    }),
    ProjectSlot({ onMount: (element) => slots.mount(workbenchSlots.sidebarProjects, element) }),
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

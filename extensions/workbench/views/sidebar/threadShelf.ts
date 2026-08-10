import { button, derive, div, dynamicChild, icon, list, show, span } from "@vaakx-dev/vrui";
import type { Sig } from "@vaakx-dev/vrui";
import { ChevronDown, ChevronRight, Plus } from "lucide";

import type { AgentSessionSummary } from "@sand/extension-api";

import type { WorkbenchController } from "../../controller.ts";
import type { WorkbenchState } from "../../state.ts";
import { sessionRow } from "./threadRow.ts";

interface ShelfOptions {
  label: string;
  className: string;
  section: "snoozed" | "settled";
  open: Sig<boolean>;
  sessions: Sig<AgentSessionSummary[]>;
  total: Sig<number>;
  hidden?: Sig<number>;
  pageSize?: number;
  showMore?: () => void;
}

export function threadShelf(
  controller: WorkbenchController,
  state: WorkbenchState,
  clock: Sig<number>,
  options: ShelfOptions,
): HTMLElement {
  const hidden = options.hidden;
  const showMore = options.showMore;
  return div(
    { class: ["thread-shelf", options.className] },
    button(
      {
        class: "shelf-toggle",
        "aria-expanded": options.open,
        onClick: options.open.toggle(),
      },
      span(derive(() => options.open.get()
        ? options.label
        : `${options.label} (${options.total.get()})`)),
      span({ class: "shelf-line" }),
      dynamicChild(options.open, (open) => icon(open ? ChevronDown : ChevronRight, 12)),
    ),
    list(
      options.sessions,
      (session) => session.id,
      (session) => sessionRow(controller, state, clock, session.get(), options.section),
      div({ class: "thread-section slim" }),
    ),
    hidden && showMore
      ? show(
          derive(() => options.open.get() && hidden.get() > 0),
          () => button(
            { class: "show-more-threads", onClick: showMore },
            icon(Plus, 13),
            hidden.map((value) => `Show ${Math.min(value, options.pageSize ?? value)} more`),
          ),
        )
      : null,
  );
}

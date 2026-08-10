import { button, derive, div, dynamicChild, icon, list, show, span } from "@vaakx-dev/vrui";
import type { Sig } from "@vaakx-dev/vrui";
import { ChevronDown, ChevronRight, Plus } from "lucide";

import type { AgentThreadSummary, UiControls } from "@sand/extension-api";

import type { WorkbenchController } from "../../../controller.ts";
import type { WorkbenchState } from "../../../state.ts";
import { row } from "./row.ts";

interface ShelfOptions {
  label: string;
  className: string;
  section: "snoozed" | "settled";
  open: Sig<boolean>;
  threads: Sig<AgentThreadSummary[]>;
  total: Sig<number>;
  hidden?: Sig<number>;
  pageSize?: number;
  showMore?: () => void;
}

export function shelf(
  controller: WorkbenchController,
  state: WorkbenchState,
  controls: UiControls,
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
      options.threads,
      (thread) => thread.id,
      (thread) => row(controller, state, controls, clock, thread.get(), options.section),
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

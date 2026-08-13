import { button, derive, div, dynamicChild, icon, list, show, span } from "@vaakx-dev/vrui";
import type { Sig } from "@vaakx-dev/vrui";
import { ChevronDown, ChevronRight, Plus } from "lucide";

import type { AgentThreadSummary } from "@sand/extension-api";
import type { SandUi } from "sand:api/ui";

import type { WorkbenchController } from "../../../controller.ts";
import type { WorkbenchState } from "../../../state.ts";
import { row } from "./row.ts";
import { styled } from "sand:api/ui";

const Shelf = styled(div, { marginTop: "var(--space-compact)" });
const Toggle = styled(button, {
  width: "100%",
  height: "var(--control-large)",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-small)",
  padding: "0 var(--space-medium)",
  color: "var(--muted)",
  cursor: "pointer",
  textAlign: "left",
  fontSize: "var(--font-caption)",
  fontWeight: "var(--weight-semibold)",
  "&:hover": { color: "var(--muted)" },
  "[data-accent=true] &": { color: "var(--accent)" },
});
const Line = styled(span, { height: 1, flex: 1, background: "var(--border)" });
const Section = styled(div, { display: "flex", flexDirection: "column", gap: "var(--space-compact)" });

interface ShelfOptions {
  label: string;
  accent?: boolean;
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
  controls: SandUi,
  clock: Sig<number>,
  options: ShelfOptions,
): HTMLElement {
  const hidden = options.hidden;
  const showMore = options.showMore;
  return Shelf(
    { "data-accent": options.accent ?? false },
    Toggle(
      {
        "aria-expanded": options.open,
        onClick: options.open.toggle(),
      },
      span(derive(() => options.open.get()
        ? options.label
        : `${options.label} (${options.total.get()})`)),
      Line({}),
      dynamicChild(options.open, (open) => icon(open ? ChevronDown : ChevronRight, controls.tokens.size.iconTiny)),
    ),
    list(
      options.threads,
      (thread) => thread.id,
      (thread) => row(controller, state, controls, clock, thread.get(), options.section),
      Section({}),
    ),
    hidden && showMore
      ? show(
          derive(() => options.open.get() && hidden.get() > 0),
          () => controls.button(
            { variant: "ghost", onClick: showMore },
            icon(Plus, controls.tokens.size.iconCompact),
            hidden.map((value) => `Show ${Math.min(value, options.pageSize ?? value)} more`),
          ),
        )
      : null,
  );
}

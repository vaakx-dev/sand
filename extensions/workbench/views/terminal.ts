import { derive, div, keep, list } from "@vaakx-dev/vrui";

import type { WorkbenchController } from "../controller.ts";
import type { WorkbenchState } from "../state.ts";
import { terminalActions } from "./terminal/actions.ts";
import { terminalPane } from "./terminal/pane.ts";
import { terminalResizeGrip } from "./terminal/resize.ts";

export function terminal(controller: WorkbenchController, state: WorkbenchState): HTMLElement {
  return keep(state.bottomOpen, () => {
    const columns = derive(() =>
      state.terminalLayout.get() === "columns"
        ? `repeat(${Math.max(1, state.terminalPanes.get().length)}, minmax(0, 1fr))`
        : "minmax(0, 1fr)"
    );
    const rows = derive(() =>
      state.terminalLayout.get() === "rows"
        ? `repeat(${Math.max(1, state.terminalPanes.get().length)}, minmax(0, 1fr))`
        : "minmax(0, 1fr)"
    );
    return div(
      {
        class: "bottom-panel",
        style: { height: state.terminalHeight.map((height) => `${height}px`) },
      },
      terminalResizeGrip(controller, state),
      terminalActions(controller, state),
      list(
        state.terminalPanes,
        (pane) => pane.id,
        (pane) => terminalPane(controller, state, pane.get()),
        div({
          class: ["terminal-panes", {
            columns: state.terminalLayout.map((layout) => layout === "columns"),
            rows: state.terminalLayout.map((layout) => layout === "rows"),
          }],
          style: { gridTemplateColumns: columns, gridTemplateRows: rows },
        }),
      ),
    );
  });
}

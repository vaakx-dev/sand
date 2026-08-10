import { button, div, icon } from "@vaakx-dev/vrui";
import type { MaybeReactive } from "@vaakx-dev/vrui";
import { Plus, SquareSplitHorizontal, SquareSplitVertical, Trash2 } from "lucide";

import type { WorkbenchController } from "../../controller.ts";
import type { WorkbenchState } from "../../state.ts";

export function terminalActions(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  return div(
    { class: "terminal-actions" },
    action(
      "Split Terminal Vertically (Ctrl+Shift+D)",
      SquareSplitVertical,
      () => void controller.terminal.create("columns"),
    ),
    action(
      "Split Terminal Horizontally",
      SquareSplitHorizontal,
      () => void controller.terminal.create("rows"),
    ),
    action(
      "New Terminal (Ctrl+N)",
      Plus,
      () => void controller.terminal.create(),
    ),
    action(
      "Close Terminal",
      Trash2,
      () => {
        const id = state.terminalActiveId.get();
        if (id) void controller.terminal.close(id);
      },
      state.terminalActiveId.map((id) => !id),
    ),
  );
}

function action(
  label: string,
  actionIcon: Parameters<typeof icon>[0],
  run: () => void,
  disabled: MaybeReactive<boolean> = false,
): HTMLElement {
  return button(
    {
      class: "terminal-action",
      "aria-label": label,
      "data-tooltip": label,
      disabled,
      onClick: run,
    },
    icon(actionIcon, 13),
  );
}

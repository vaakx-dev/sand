import { button, div, input, onRaf, show, span, stop } from "@vaakx-dev/vrui";

import type { WorkbenchController } from "../../controller.ts";
import type { WorkbenchState } from "../../state.ts";

export function threadRenameDialog(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  return show(state.threadRename.map(Boolean), () => div(
    { class: "overlay thread-dialog-overlay", onPointerDown: () => state.threadRename.set(null) },
    div(
      { class: "thread-dialog", onPointerDown: stop },
      span({ class: "thread-dialog-title" }, "Rename thread"),
      input({
        class: "thread-dialog-input",
        bindValue: state.threadRenameInput,
        onMount: (element) => onRaf(() => {
          element.focus();
          element.select();
        }),
        onKeyDown: (event) => {
          if (event.key === "Escape") state.threadRename.set(null);
          if (event.key === "Enter") void controller.agent.renameThread();
        },
      }),
      div(
        { class: "thread-dialog-actions" },
        button(
          { class: "secondary-button", onClick: () => state.threadRename.set(null) },
          "Cancel",
        ),
        button(
          { class: "primary-button", onClick: () => void controller.agent.renameThread() },
          "Rename",
        ),
      ),
    ),
  ));
}

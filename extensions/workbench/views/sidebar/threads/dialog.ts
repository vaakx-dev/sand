import { button, div, input, onRaf, show, span, stop } from "@vaakx-dev/vrui";

import type { WorkbenchController } from "../../../controller.ts";
import type { WorkbenchState } from "../../../state.ts";

export function renameDialog(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  return show(state.threads.rename.map(Boolean), () => div(
    { class: "overlay thread-dialog-overlay", onPointerDown: () => state.threads.rename.set(null) },
    div(
      { class: "thread-dialog", onPointerDown: stop },
      span({ class: "thread-dialog-title" }, "Rename thread"),
      input({
        class: "thread-dialog-input",
        bindValue: state.threads.renameInput,
        onMount: (element) => onRaf(() => {
          element.focus();
          element.select();
        }),
        onKeyDown: (event) => {
          if (event.key === "Escape") state.threads.rename.set(null);
          if (event.key === "Enter") void controller.threads.rename();
        },
      }),
      div(
        { class: "thread-dialog-actions" },
        button(
          { class: "secondary-button", onClick: () => state.threads.rename.set(null) },
          "Cancel",
        ),
        button(
          { class: "primary-button", onClick: () => void controller.threads.rename() },
          "Rename",
        ),
      ),
    ),
  ));
}

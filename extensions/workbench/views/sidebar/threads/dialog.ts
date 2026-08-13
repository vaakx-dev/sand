import { onRaf, show } from "@vaakx-dev/vrui";

import type { SandUi } from "sand:api/ui";
import type { WorkbenchController } from "../../../controller.ts";
import type { WorkbenchState } from "../../../state.ts";

export function renameDialog(
  controller: WorkbenchController,
  state: WorkbenchState,
  ui: SandUi,
): HTMLElement {
  return show(state.threads.rename.map(Boolean), () => ui.modal(
    { label: "Rename thread", width: 384, onDismiss: () => state.threads.rename.set(null) },
    ui.modalHeader({ title: "Rename thread" }),
    ui.modalBody(
      {},
      ui.textField({
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
      ui.modalActions(
        ui.button({ onClick: () => state.threads.rename.set(null) }, "Cancel"),
        ui.button({ variant: "primary", onClick: () => void controller.threads.rename() }, "Rename"),
      ),
    ),
  ));
}

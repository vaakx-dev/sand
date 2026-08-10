import { derive, div, icon, show } from "@vaakx-dev/vrui";
import { RefreshCw } from "lucide";

import type { WorkbenchController } from "../../controller.ts";
import type { WorkbenchState } from "../../state.ts";
import { iconButton } from "../shared/iconButton.ts";
import { rightPanelActions } from "./actions.ts";
import { rightTabList } from "./tabs.ts";

export function rightPanelHeader(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  const refreshVisible = derive(() =>
    state.rightTabs.get().length > 0
    && (state.rightActiveTab.get()?.view === "files" || state.rightActiveTab.get()?.view === "changes")
  );
  return div(
    { class: "right-panel-header", "data-tauri-drag-region": "" },
    div(
      { class: "right-tabs" },
      rightTabList(controller, state),
    ),
    div(
      { class: "right-context-action-slot" },
      show(refreshVisible, () => iconButton(
        {
          label: "Refresh files and changes",
          onClick: () => {
            void controller.workspace.refreshTree();
            void controller.git.refresh();
          },
        },
        icon(RefreshCw, 14),
      )),
    ),
    rightPanelActions(controller, state),
  );
}

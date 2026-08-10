import { button, div, icon, list, span, stopThen } from "@vaakx-dev/vrui";
import { Files, GitCompare, Globe2, ListTodo, X } from "lucide";

import type { WorkbenchController } from "../../controller.ts";
import type { RightTab, RightView } from "../../models.ts";
import { closePanelTab } from "../../panel.ts";
import type { WorkbenchState } from "../../state.ts";

export function rightTabList(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  return list(
    state.rightTabs,
    (tab) => tab.id,
    (tab) => rightTab(controller, state, tab.get()),
    div({ class: "right-tab-list", role: "tablist" }),
  );
}

function rightTab(
  controller: WorkbenchController,
  state: WorkbenchState,
  tab: RightTab,
): HTMLElement {
  const details = panelDetails(tab.view);
  return div(
    {
      class: ["right-tab", { active: state.rightActiveId.map((id) => id === tab.id) }],
      role: "tab",
      tabIndex: 0,
      "aria-selected": state.rightActiveId.map((id) => id === tab.id),
      onClick: state.rightActiveId.setter(tab.id),
      onKeyDown: (event) => {
        if (event.key === "Enter" || event.key === " ") state.rightActiveId.set(tab.id);
      },
    },
    icon(details.icon, 14),
    span({ class: "right-tab-label" }, details.label),
    button(
      {
        class: "right-tab-close",
        "aria-label": `Close ${details.label}`,
        onClick: stopThen(() => {
          closePanelTab(state, tab.id);
          void controller.preferences.saveLayout();
        }),
      },
      icon(X, 11),
    ),
  );
}

function panelDetails(view: RightView): {
  label: string;
  icon: Parameters<typeof icon>[0];
} {
  switch (view) {
    case "browser": return { label: "Browser", icon: Globe2 };
    case "changes": return { label: "Diff", icon: GitCompare };
    case "tasks": return { label: "Plan", icon: ListTodo };
    default: return { label: "Files", icon: Files };
  }
}

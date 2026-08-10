import { button, div, icon, span } from "@vaakx-dev/vrui";

import type { Activity } from "../../models.ts";
import type { WorkbenchState } from "../../state.ts";

export function panelHeader(title: string, actions?: HTMLElement): HTMLElement {
  return div({ class: "panel-header" }, span({ class: "panel-title" }, title), actions || null);
}

export function footerButton(
  state: WorkbenchState,
  activity: Activity,
  node: Parameters<typeof icon>[0],
  label: string,
): HTMLElement {
  return button(
    {
      class: ["sidebar-footer-button", { active: state.activity.map((value) => value === activity) }],
      onClick: state.activity.setter(activity),
    },
    icon(node, 14),
    label,
  );
}

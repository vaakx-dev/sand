import type { Child } from "@vaakx-dev/vrui";

import type { SandUi } from "sand:api/ui";
import type { WorkbenchState } from "../../state.ts";

export function page(
  ui: SandUi,
  title: string,
  ...children: (HTMLElement | null)[]
): HTMLElement {
  return ui.page({ title }, ...children);
}

export function settingRow(
  ui: SandUi,
  title: string,
  description: Child,
  control: HTMLElement,
): HTMLElement {
  return ui.setting({ title, description, control });
}

export function toggle(
  ui: SandUi,
  signal: WorkbenchState["sidebarOpen"],
  after: () => void,
): HTMLElement {
  return ui.switch({ label: "Toggle setting", checked: signal, onChange: after });
}

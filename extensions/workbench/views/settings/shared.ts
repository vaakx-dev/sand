import { button, div, h1, span } from "@vaakx-dev/vrui";

import type { WorkbenchState } from "../../state.ts";

export function page(title: string, ...children: (HTMLElement | null)[]): HTMLElement {
  return div(
    { class: "settings-page" },
    div({ class: "settings-page-content" }, h1(title), ...children),
  );
}

export function settingRow(
  title: string,
  description: string | ReturnType<WorkbenchState["root"]["map"]>,
  control: HTMLElement,
): HTMLElement {
  return div(
    { class: "setting-row" },
    div(
      { class: "setting-copy" },
      span({ class: "setting-title" }, title),
      span({ class: "setting-description" }, description),
    ),
    div({ class: "setting-control" }, control),
  );
}

export function toggle(signal: WorkbenchState["sidebarOpen"], after: () => void): HTMLElement {
  return button(
    {
      class: ["switch", { on: signal }],
      role: "switch",
      "aria-checked": signal,
      onClick: () => {
        signal.toggle()();
        after();
      },
    },
    span({ class: "switch-knob" }),
  );
}

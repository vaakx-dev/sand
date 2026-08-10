import { div, span } from "@vaakx-dev/vrui";

export function sidebarHeader(title: string, actions?: HTMLElement): HTMLElement {
  return div({ class: "sidebar-header" }, span({ class: "sidebar-title" }, title), actions || null);
}

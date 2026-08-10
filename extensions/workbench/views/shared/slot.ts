import { div } from "@vaakx-dev/vrui";

import type { UiSlotRegistry } from "@sand/extension-api";

export function uiSlot(
  slots: UiSlotRegistry,
  name: string,
  className: string,
): HTMLElement {
  return div({ class: className, onMount: (container) => slots.mount(name, container) });
}

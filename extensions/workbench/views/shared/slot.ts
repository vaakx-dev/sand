import { div } from "@vaakx-dev/vrui";

import type { UiSlotRegistry } from "@sand/extension-api";

export function uiSlot(
  slots: UiSlotRegistry,
  name: string,
  className: string,
): HTMLElement {
  return div({ class: className, onMount: (container) => slots.mount(name, container) });
}

export function mountMeasuredUiSlot(
  slots: UiSlotRegistry,
  name: string,
  property: string,
): (container: HTMLElement) => () => void {
  return (container) => {
    const host = container.closest<HTMLElement>(".workbench");
    const unmount = slots.mount(name, container);
    const measure = () => host?.style.setProperty(property, `${container.offsetWidth}px`);
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    measure();
    return () => {
      observer.disconnect();
      unmount();
      host?.style.removeProperty(property);
    };
  };
}

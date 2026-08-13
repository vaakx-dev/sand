import { div } from "@vaakx-dev/vrui";

import type { UiSlotRegistry } from "../../api.ts";

export function uiSlot(
  slots: UiSlotRegistry,
  name: string,
): HTMLElement {
  return div({ onMount: mountUiSlot(slots, name) });
}

export function mountUiSlot(
  slots: UiSlotRegistry,
  name: string,
): (container: HTMLElement) => () => void {
  return (container) => slots.mount(name, container);
}

export function mountMeasuredUiSlot(
  slots: UiSlotRegistry,
  name: string,
  property: string,
): (container: HTMLElement) => () => void {
  return (container) => {
    const host = container.closest<HTMLElement>("[data-workbench]");
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

export function mountObservedUiSlot(
  slots: UiSlotRegistry,
  name: string,
  attribute: string,
): (container: HTMLElement) => () => void {
  return (container) => {
    const host = container.closest<HTMLElement>("[data-workbench]");
    const unmount = slots.mount(name, container);
    const measure = () => host?.setAttribute(attribute, String(container.offsetWidth > 0));
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    measure();
    return () => {
      observer.disconnect();
      unmount();
      host?.removeAttribute(attribute);
    };
  };
}

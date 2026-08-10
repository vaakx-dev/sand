import { onWindow } from "@vaakx-dev/vrui";

export function closeOnOutside(element: HTMLElement, close: () => void): () => void {
  return onWindow(element, "pointerdown", (event) => {
    if (!element.contains(event.target as Node)) close();
  });
}

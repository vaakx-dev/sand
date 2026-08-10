import { div, onWindow } from "@vaakx-dev/vrui";
import type { Sig } from "@vaakx-dev/vrui";

import type { WorkbenchController } from "../../controller.ts";

export const SIDEBAR_MIN = 240;
export const SIDEBAR_MAX = 420;
export const RIGHT_MIN = 320;
export const RIGHT_MAX = 720;

export function paneResizer(
  side: "left" | "right",
  width: Sig<number>,
  minimum: number,
  maximum: number,
  controller: WorkbenchController,
): HTMLElement {
  let dragging = false;
  let startX = 0;
  let startWidth = 0;

  return div({
    class: ["resizer", side],
    onPointerDown: (event) => {
      if (event.button !== 0) return;
      dragging = true;
      startX = event.clientX;
      startWidth = width.get();
      document.body.classList.add("resizing");
      event.preventDefault();
    },
    onMount: (element) => {
      const move = onWindow(element, "pointermove", (raw) => {
        if (!dragging) return;
        const event = raw as PointerEvent;
        const delta = side === "left" ? event.clientX - startX : startX - event.clientX;
        width.set(Math.min(maximum, Math.max(minimum, startWidth + delta)));
      });
      const end = onWindow(element, "pointerup", () => {
        if (!dragging) return;
        dragging = false;
        document.body.classList.remove("resizing");
        void controller.preferences.saveLayout();
      });
      return () => {
        dragging = false;
        document.body.classList.remove("resizing");
        move();
        end();
      };
    },
  });
}

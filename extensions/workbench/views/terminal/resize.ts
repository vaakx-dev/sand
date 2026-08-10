import { div, onWindow } from "@vaakx-dev/vrui";

import type { WorkbenchController } from "../../controller.ts";
import type { WorkbenchState } from "../../state.ts";

const MIN_HEIGHT = 120;
const MAX_HEIGHT = 620;

export function terminalResizeGrip(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  let dragging = false;
  let startY = 0;
  let startHeight = 0;
  return div({
    class: "terminal-resize-grip",
    onPointerDown: (event) => {
      if (event.button !== 0) return;
      dragging = true;
      startY = event.clientY;
      startHeight = state.terminalHeight.get();
      document.body.classList.add("resizing-terminal");
      event.preventDefault();
    },
    onMount: (element) => {
      const move = onWindow(element, "pointermove", (raw) => {
        if (!dragging) return;
        const event = raw as PointerEvent;
        state.terminalHeight.set(Math.min(
          MAX_HEIGHT,
          Math.max(MIN_HEIGHT, startHeight + startY - event.clientY),
        ));
      });
      const end = onWindow(element, "pointerup", () => {
        if (!dragging) return;
        dragging = false;
        document.body.classList.remove("resizing-terminal");
        void controller.preferences.saveLayout();
      });
      return () => {
        dragging = false;
        document.body.classList.remove("resizing-terminal");
        move();
        end();
      };
    },
  });
}

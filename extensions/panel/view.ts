import { div, list, onWindow, show } from "@vaakx-dev/vrui";

import type { UiControls } from "@sand/extension-api";

import type { PanelController } from "./controller.ts";
import { normalizeWidth, type PanelState } from "./state.ts";
import { header } from "./views/header.ts";
import { surfacePicker } from "./views/picker.ts";

export function panelView(
  controller: PanelController,
  state: PanelState,
  controls: UiControls,
): HTMLElement {
  return div(
    {
      class: ["panel-host", { maximized: state.maximized, open: state.open }],
      hidden: state.open.map((open) => !open),
      style: { "--panel-width": state.width.map((width) => `${width}px`) },
    },
    resizeGrip(controller, state),
    div(
      { class: "panel-shell" },
      header(controller, state, controls),
      surfaceStack(state),
      show(state.activeTab.map((tab) => !tab), () => surfacePicker(controller, state)),
    ),
  );
}

function surfaceStack(state: PanelState): HTMLElement {
  return list(
    state.tabs,
    (tab) => tab.id,
    (tab) => {
      const value = tab.get();
      return div(
        {
          class: "panel-content",
          hidden: state.activeId.map((id) => id !== value.id),
        },
        value.node,
      );
    },
    div({
      class: "panel-stack",
      hidden: state.activeTab.map((tab) => !tab),
    }),
  );
}

function resizeGrip(controller: PanelController, state: PanelState): HTMLElement {
  let dragging = false;
  return div({
    class: "panel-resize-grip",
    onPointerDown: (event) => {
      if (event.button !== 0 || state.maximized.get()) return;
      dragging = true;
      document.body.classList.add("resizing");
      event.preventDefault();
    },
    onMount: (element) => {
      const move = onWindow(element, "pointermove", (raw) => {
        if (!dragging) return;
        const event = raw as PointerEvent;
        state.width.set(normalizeWidth(window.innerWidth - event.clientX));
      });
      const end = onWindow(element, "pointerup", () => {
        if (!dragging) return;
        dragging = false;
        document.body.classList.remove("resizing");
        controller.saveWidth();
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

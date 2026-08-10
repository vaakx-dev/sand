import { button, div, dynamicChild, icon, list, onWindow, show, span, stopThen } from "@vaakx-dev/vrui";
import type { MaybeReactive } from "@vaakx-dev/vrui";
import {
  Files,
  GitCompare,
  Globe2,
  ListTodo,
  Maximize2,
  Minimize2,
  PanelRightClose,
  Plus,
  RefreshCw,
  SquareTerminal,
  X,
} from "lucide";

import type { UiSlotRegistry, UiSurfaceRegistry } from "@sand/extension-api";

import type { RightController } from "./controller.ts";
import type { PanelTab } from "./models.ts";
import type { RightState } from "./state.ts";

export function rightView(
  controller: RightController,
  state: RightState,
  slots: UiSlotRegistry,
  surfaces: UiSurfaceRegistry,
): HTMLElement {
  return div(
    {
      class: ["right-panel-host", { maximized: state.maximized, open: state.open }],
      hidden: state.open.map((open) => !open),
      style: { "--right-panel-width": state.width.map((width) => `${width}px`) },
    },
    resizeGrip(controller, state),
    div(
      { class: "right-panel" },
      header(controller, state, slots, surfaces),
      show(state.error.map(Boolean), () => div({ class: "right-error" }, state.error)),
      dynamicChild(state.activeTab, (tab) => tab?.node ?? surfacePicker(state, surfaces)),
    ),
  );
}

function header(
  controller: RightController,
  state: RightState,
  slots: UiSlotRegistry,
  surfaces: UiSurfaceRegistry,
): HTMLElement {
  return div(
    { class: "right-panel-header", "data-tauri-drag-region": "" },
    list(
      state.tabs,
      (tab) => tab.id,
      (tab) => panelTab(controller, state, tab.get()),
      div({ class: "right-tab-list", role: "tablist" }),
    ),
    div(
      { class: "right-context-action-slot" },
      show(state.activeTab.map((tab) => tab?.surface.id === "changes"), () =>
        iconButton("Refresh changes", false, RefreshCw, () => void controller.refreshGit())
      ),
    ),
    div(
      { class: "right-panel-actions" },
      div(
        { class: "right-add-wrap" },
        iconButton("Open surface", state.addOpen, Plus, state.addOpen.toggle()),
        show(state.addOpen, () => surfaceMenu(state, surfaces)),
      ),
      iconButton(
        state.maximized.map((maximized) => maximized ? "Restore panel" : "Maximize panel"),
        state.maximized,
        dynamicChild(state.maximized, (maximized) => icon(maximized ? Minimize2 : Maximize2, 14)),
        () => controller.toggleMaximized(),
      ),
      slot(slots, "right.header.actions", "right-extension-actions"),
      iconButton("Hide right panel", true, PanelRightClose, () => controller.hide()),
    ),
  );
}

function panelTab(controller: RightController, state: RightState, tab: PanelTab): HTMLElement {
  return div(
    {
      class: ["right-tab", { active: state.activeId.map((id) => id === tab.id) }],
      role: "tab",
      tabIndex: 0,
      "aria-selected": state.activeId.map((id) => id === tab.id),
      onClick: state.activeId.setter(tab.id),
      onKeyDown: (event) => {
        if (event.key === "Enter" || event.key === " ") state.activeId.set(tab.id);
      },
    },
    icon(surfaceIcon(tab.surface.icon), 14),
    span({ class: "right-tab-label" }, tab.surface.label),
    button(
      {
        class: "right-tab-close",
        "aria-label": `Close ${tab.surface.label}`,
        onClick: stopThen(() => controller.closeTab(tab.id)),
      },
      icon(X, 11),
    ),
  );
}

function surfacePicker(state: RightState, surfaces: UiSurfaceRegistry): HTMLElement {
  return div(
    { class: "surface-picker" },
    div({ class: "surface-picker-title" }, "Open a surface"),
    div({ class: "surface-picker-description" }, "Choose what to show in the right panel."),
    dynamicChild(state.surfaces, (items) => div(
      { class: "surface-grid" },
      ...items.map((surface) => button(
        {
          class: "surface-card",
          disabled: surface.id === "changes" && !state.gitRepository.get(),
          onClick: () => openSurface(state, surfaces, surface),
        },
        icon(surfaceIcon(surface.icon), 18),
        span({ class: "surface-card-label" }, surface.label),
        span({ class: "surface-card-description" }, surface.description),
      )),
    )),
  );
}

function surfaceMenu(state: RightState, surfaces: UiSurfaceRegistry): HTMLElement {
  return div(
    {
      class: "right-add-menu",
      role: "menu",
      onMount: (element) => onWindow(element, "pointerdown", (event) => {
        if (!element.parentElement?.contains(event.target as Node)) state.addOpen.set(false);
      }),
    },
    ...state.surfaces.get().map((surface) => button(
      {
        class: "right-add-row",
        role: "menuitem",
        disabled: surface.id === "changes" && !state.gitRepository.get(),
        onClick: () => openSurface(state, surfaces, surface),
      },
      icon(surfaceIcon(surface.icon), 14),
      surface.label,
    )),
  );
}

function openSurface(
  state: RightState,
  surfaces: UiSurfaceRegistry,
  surface: ReturnType<UiSurfaceRegistry["list"]>[number],
): void {
  state.addOpen.set(false);
  if (!surface.render) state.maximized.set(false);
  void surfaces.open(surface.id);
}

function iconButton(
  label: MaybeReactive<string>,
  selected: MaybeReactive<boolean>,
  buttonIcon: Parameters<typeof icon>[0] | HTMLElement,
  run: () => void,
): HTMLElement {
  return button(
    {
      class: ["icon-button", { active: selected }],
      "aria-label": label,
      "aria-pressed": selected,
      "data-tooltip": label,
      onClick: run,
    },
    buttonIcon instanceof HTMLElement ? buttonIcon : icon(buttonIcon, 14),
  );
}

function slot(slots: UiSlotRegistry, name: string, className: string): HTMLElement {
  return div({ class: className, onMount: (container) => slots.mount(name, container) });
}

function resizeGrip(controller: RightController, state: RightState): HTMLElement {
  let dragging = false;
  return div({
    class: "right-resize-grip",
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
        state.width.set(Math.min(900, Math.max(300, window.innerWidth - event.clientX)));
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

function surfaceIcon(name: string): Parameters<typeof icon>[0] {
  switch (name) {
    case "browser": return Globe2;
    case "changes": return GitCompare;
    case "plan": return ListTodo;
    case "terminal": return SquareTerminal;
    default: return Files;
  }
}

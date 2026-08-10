import { button, div, icon, onWindow, show, span } from "@vaakx-dev/vrui";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  ChevronDown,
  Code2,
  FolderOpen,
  GitBranch,
  Minus,
  PanelLeftOpen,
  Square,
  X,
} from "lucide";

import type { UiSlotRegistry } from "@sand/extension-api";

import type { WorkbenchController } from "../../controller.ts";
import type { WorkbenchState } from "../../state.ts";
import { projectName } from "../format.ts";
import { uiSlot } from "../shared/slot.ts";

export function windowControls(): HTMLElement {
  const window = getCurrentWindow();
  return div(
    { class: "window-controls" },
    button(
      { class: "window-control", "aria-label": "Minimize", onClick: () => void window.minimize() },
      icon(Minus, 13),
    ),
    button(
      { class: "window-control", "aria-label": "Maximize", onClick: () => void window.toggleMaximize() },
      icon(Square, 11),
    ),
    button(
      { class: "window-control close", "aria-label": "Close", onClick: () => void window.close() },
      icon(X, 13),
    ),
  );
}

export function topbar(
  controller: WorkbenchController,
  state: WorkbenchState,
  slots: UiSlotRegistry,
): HTMLElement {
  return div(
    { class: "topbar", "data-tauri-drag-region": "" },
    show(state.sidebarOpen.map((open) => !open), () => button(
      {
        class: "sidebar-trigger",
        "aria-label": "Open sidebar",
        "data-tooltip": "Open sidebar (Ctrl+B)",
        onClick: () => {
          state.sidebarOpen.set(true);
          void controller.preferences.saveLayout();
        },
      },
      icon(PanelLeftOpen, 15),
    )),
    div(
      { class: "topbar-breadcrumb", "data-tauri-drag-region": "" },
      icon(FolderOpen, 13),
      span({ class: "breadcrumb-project" }, state.root.map(projectName)),
      span({ class: "breadcrumb-slash" }, "/"),
      span({ class: "topbar-title" }, state.threadId.map((id) => {
        if (!id) return "New thread";
        return state.threads.get().find((thread) => thread.id === id)?.title || "Thread";
      })),
    ),
    div(
      { class: "top-actions" },
      openAction(controller, state),
      show(state.gitRepository.map((repository) => !repository), () => button(
        { class: "top-action", "data-tooltip": "Initialize Git", onClick: () => void controller.git.initialize() },
        icon(GitBranch, 13),
        "Initialize Git",
      )),
      uiSlot(slots, "workbench.topbar.actions", "top-panel-controls"),
    ),
  );
}

function openAction(controller: WorkbenchController, state: WorkbenchState): HTMLElement {
  return div(
    { class: "open-action-wrap" },
    button(
      {
        class: ["top-action", { active: state.openMenuOpen }],
        "data-tooltip": "Open workspace",
        onClick: state.openMenuOpen.toggle(),
      },
      icon(FolderOpen, 13),
      "Open",
      icon(ChevronDown, 11),
    ),
    show(state.openMenuOpen, () => div(
      {
        class: "open-menu",
        onMount: (element) => onWindow(element, "pointerdown", (event) => {
          if (!element.parentElement?.contains(event.target as Node)) state.openMenuOpen.set(false);
        }),
      },
      button(
        { class: "open-menu-row", onClick: () => void controller.external.open("vscode") },
        icon(Code2, 14),
        span("VS Code"),
        span({ class: "open-shortcut" }, "Ctrl+O"),
      ),
      button(
        { class: "open-menu-row", onClick: () => void controller.external.open("explorer") },
        icon(FolderOpen, 14),
        span("Explorer"),
      ),
    )),
  );
}

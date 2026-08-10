import { button, div, icon, onWindow, show, span } from "@vaakx-dev/vrui";
import { ChevronDown, Folder, FolderOpen, Plus } from "lucide";

import type { UiControls } from "@sand/extension-api";

import type { ProjectsController } from "./controller.ts";
import type { ProjectsState } from "./state.ts";

export function controls(
  controller: ProjectsController,
  state: ProjectsState,
  uiControls: UiControls,
): HTMLElement {
  return div(
    { class: "project-scope-row" },
    button(
      {
        class: "project-scope",
        "aria-expanded": state.menuOpen,
        "aria-haspopup": "menu",
        onClick: () => controller.toggleMenu(),
      },
      icon(FolderOpen, 14),
      span({ class: "project-scope-name" }, "All projects"),
      icon(ChevronDown, 13),
    ),
    uiControls.iconButton({
      label: "New project",
      className: "new-project-button",
      renderIcon: (size) => icon(Plus, size),
      onClick: () => controller.openSource(),
    }),
    show(state.menuOpen, () => menu(controller, state)),
  );
}

function menu(
  controller: ProjectsController,
  state: ProjectsState,
): HTMLElement {
  return div(
    {
      class: "project-popover",
      role: "menu",
      onMount: (element) => onWindow(element, "pointerdown", (event) => {
        if (!element.parentElement?.contains(event.target as Node)) {
          state.menuOpen.set(false);
        }
      }),
    },
    button(
      {
        class: ["project-popover-row", "active"],
        onClick: () => state.menuOpen.set(false),
      },
      icon(FolderOpen, 14),
      span({ class: "project-popover-name" }, "All projects"),
    ),
    ...state.items.get().map((project) => button(
      {
        class: "project-popover-row",
        title: project.path,
        onClick: () => {
          state.menuOpen.set(false);
          void controller.switchTo(project.path);
        },
      },
      icon(Folder, 14),
      span({ class: "project-popover-name" }, project.name),
    )),
  );
}

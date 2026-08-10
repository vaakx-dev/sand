import { button, div, icon, onWindow, span } from "@vaakx-dev/vrui";
import { Folder, FolderOpen } from "lucide";

import type { WorkbenchController } from "../../controller.ts";
import type { WorkbenchState } from "../../state.ts";

export function projectMenu(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  return div(
    {
      class: "project-popover",
      onMount: (element) => onWindow(element, "pointerdown", (event) => {
        if (!element.parentElement?.contains(event.target as Node)) {
          state.projectMenuOpen.set(false);
        }
      }),
    },
    button(
      {
        class: ["project-popover-row", "active"],
        onClick: () => state.projectMenuOpen.set(false),
      },
      icon(FolderOpen, 14),
      span({ class: "project-popover-name" }, "All projects"),
    ),
    ...state.projects.get().map((project) => button(
      {
        class: "project-popover-row",
        title: project.path,
        onClick: () => {
          state.projectMenuOpen.set(false);
          void controller.projects.switchTo(project.path);
        },
      },
      icon(Folder, 14),
      span({ class: "project-popover-name" }, project.name),
    )),
  );
}

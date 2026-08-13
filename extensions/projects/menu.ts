import { div, icon } from "@vaakx-dev/vrui";
import { Folder, FolderOpen, Plus } from "lucide";

import type { SandUi } from "sand:api/ui";
import { styled } from "sand:api/ui";
import type { ProjectsController } from "./controller.ts";
import type { ProjectsState } from "./state.ts";

const ProjectControls = styled(div, {
  width: "100%",
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) var(--control-height)",
  gap: "var(--space-compact)",
});

export function controls(
  controller: ProjectsController,
  state: ProjectsState,
  ui: SandUi,
): HTMLElement {
  return ProjectControls(
    {},
    ui.menuButton({
      label: "All projects",
      trigger: "selector",
      open: state.menuOpen,
      width: 224,
      renderIcon: (size) => icon(FolderOpen, size),
      items: () => [
        {
          label: "All projects",
          renderIcon: (size: number) => icon(FolderOpen, size),
        },
        ...state.items.get().map((project) => ({
          label: project.name,
          renderIcon: (size: number) => icon(Folder, size),
          run: async () => {
            await controller.switchTo(project.path);
          },
        })),
      ],
    }),
    ui.iconButton({
      label: "New project",
      renderIcon: (size) => icon(Plus, size),
      onClick: () => controller.openSource(),
    }),
  );
}

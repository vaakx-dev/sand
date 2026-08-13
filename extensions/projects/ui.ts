import type { UiExtension } from "@sand/extension-api";

import { useUi } from "sand:api/ui";
import { ProjectsController } from "./controller.ts";
import { controls } from "./menu.ts";
import { createState } from "./state.ts";
import { projectOverlays } from "./view.ts";
import { useWorkbench, workbenchCommands, workbenchSlots } from "sand:api/workbench";

const extension: UiExtension = {
  async activate(context) {
    const ui = useUi(context.apis);
    const workbench = useWorkbench(context.apis);
    const state = createState();
    const controller = new ProjectsController(context.runtime, workbench.events, state);

    workbench.slots.register({
      id: "projects.sidebar",
      slot: workbenchSlots.sidebarProjects,
      node: controls(controller, state, ui),
    });
    workbench.slots.register({
      id: "projects.overlays",
      slot: workbenchSlots.overlays,
      node: projectOverlays(controller, state, ui),
    });
    workbench.commands.register({
      id: "projects.switch",
      label: "Projects: Switch Project",
      keybinding: "Ctrl+K",
      run: () => controller.openPicker("switch"),
    });
    workbench.commands.register({
      id: workbenchCommands.newThread,
      label: "Agent: New Session",
      keybinding: "Ctrl+N",
      run: () => controller.openPicker("newThread"),
    });
    workbench.commands.register({
      id: "projects.add",
      label: "Projects: Add Project",
      run: () => controller.openSource(),
    });
    context.runtime.subscribeWorkspace((workspace) => controller.onWorkspaceSelected(workspace));
    await controller.initialize();
  },
};

export default extension;

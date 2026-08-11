import type { UiExtension } from "@sand/extension-api";

import { ProjectsController } from "./controller.ts";
import { controls } from "./menu.ts";
import { createState } from "./state.ts";
import { projectOverlays } from "./view.ts";
import { workbenchCommands, workbenchSlots } from "../workbench/api.ts";

const extension: UiExtension = {
  async activate(context) {
    const state = createState();
    const controller = new ProjectsController(context.runtime, context.ui.events, state);

    context.ui.slots.register({
      id: "projects.sidebar",
      slot: workbenchSlots.sidebarProjects,
      node: controls(controller, state, context.ui.controls),
    });
    context.ui.slots.register({
      id: "projects.overlays",
      slot: workbenchSlots.overlays,
      node: projectOverlays(controller, state, context.ui.controls),
    });
    context.ui.commands.register({
      id: "projects.switch",
      label: "Projects: Switch Project",
      keybinding: "Ctrl+K",
      run: () => controller.openPicker("switch"),
    });
    context.ui.commands.register({
      id: workbenchCommands.newThread,
      label: "Agent: New Session",
      keybinding: "Ctrl+N",
      run: () => controller.openPicker("newThread"),
    });
    context.ui.commands.register({
      id: "projects.add",
      label: "Projects: Add Project",
      run: () => controller.openSource(),
    });
    context.runtime.subscribeWorkspace((workspace) => controller.onWorkspaceSelected(workspace));
    await controller.initialize();
  },
};

export default extension;

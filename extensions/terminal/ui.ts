import { icon } from "@vaakx-dev/vrui";
import { PanelBottom, SquareTerminal } from "lucide";

import type { UiExtension } from "@sand/extension-api";

import { workbenchEvents, workbenchSlots } from "../workbench/api.ts";
import { TerminalController } from "./controller.ts";
import { createTerminalState } from "./state.ts";
import { terminalView } from "./view.ts";

const extension: UiExtension = {
  async activate(context) {
    const state = createTerminalState();
    const controller = new TerminalController(context.runtime, state);
    const toggle = () => {
      if (!state.open.get()) context.ui.events.emit("layout.center.reveal", null);
      void controller.toggle();
    };
    context.ui.slots.register({
      id: "terminal.drawer",
      slot: workbenchSlots.bottom,
      node: terminalView(controller, state, context.ui.controls),
    });
    context.ui.slots.register({
      id: "terminal.layout",
      slot: workbenchSlots.layoutActions,
      order: 30,
      node: context.ui.controls.iconButton({
        label: "Toggle terminal drawer",
        tooltip: "Toggle terminal drawer (Ctrl+J)",
        selected: state.open,
        renderIcon: (size) => icon(PanelBottom, size),
        onClick: toggle,
      }),
    });
    context.ui.surfaces.register({
      id: "terminal",
      label: "Terminal",
      description: "Start a shell in this workspace.",
      order: 20,
      renderIcon: (size) => icon(SquareTerminal, size),
      open: () => controller.show(),
    });
    context.ui.commands.register({
      id: "terminal.toggle",
      label: "View: Toggle Terminal",
      keybinding: "Ctrl+J",
      run: () => controller.toggle(),
    });
    context.ui.events.subscribe((event) => {
      if (event.kind === workbenchEvents.activityChanged && event.payload === "settings") {
        controller.hide();
      }
    });
    context.runtime.subscribe((event) => controller.onEvent(event));
    context.runtime.subscribeWorkspace((workspace) => controller.onWorkspaceSelected(workspace));
    await controller.initialize();
  },
};

export default extension;

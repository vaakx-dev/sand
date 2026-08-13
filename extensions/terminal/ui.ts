import { icon } from "@vaakx-dev/vrui";
import { PanelBottom, SquareTerminal } from "lucide";

import type { UiExtension } from "@sand/extension-api";

import { useUi } from "sand:api/ui";
import { useWorkbench, workbenchEvents, workbenchSlots } from "sand:api/workbench";
import { TerminalController } from "./controller.ts";
import { createTerminalState } from "./state.ts";
import { terminalView } from "./view.ts";

const extension: UiExtension = {
  async activate(context) {
    const ui = useUi(context.apis);
    const workbench = useWorkbench(context.apis);
    const state = createTerminalState();
    const controller = new TerminalController(context.runtime, state);
    const toggle = () => {
      if (!state.open.get()) workbench.events.emit("layout.center.reveal", null);
      void controller.toggle();
    };
    workbench.slots.register({
      id: "terminal.drawer",
      slot: workbenchSlots.bottom,
      node: terminalView(controller, state, ui),
    });
    workbench.slots.register({
      id: "terminal.layout",
      slot: workbenchSlots.layoutActions,
      order: 30,
      node: ui.iconButton({
        label: "Toggle terminal drawer",
        selected: state.open,
        renderIcon: (size) => icon(PanelBottom, size),
        onClick: toggle,
      }),
    });
    workbench.surfaces.register({
      id: "terminal",
      label: "Terminal",
      description: "Start a shell in this workspace.",
      order: 20,
      renderIcon: (size) => icon(SquareTerminal, size),
      open: () => controller.show(),
    });
    workbench.commands.register({
      id: "terminal.toggle",
      label: "View: Toggle Terminal",
      keybinding: "Ctrl+J",
      run: () => controller.toggle(),
    });
    workbench.events.subscribe((event) => {
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

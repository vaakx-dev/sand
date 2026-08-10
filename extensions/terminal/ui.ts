import { button, icon } from "@vaakx-dev/vrui";
import type { Sig } from "@vaakx-dev/vrui";
import { PanelBottom } from "lucide";

import type { UiExtension } from "@sand/extension-api";

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
      id: "terminal.panel",
      slot: "workbench.bottom",
      node: terminalView(controller, state),
    });
    context.ui.slots.register({
      id: "terminal.topbar",
      slot: "workbench.topbar.actions",
      order: 10,
      node: toggleButton(
        "Toggle terminal drawer (Ctrl+J)",
        state.visible,
        PanelBottom,
        toggle,
        true,
      ),
    });
    context.ui.slots.register({
      id: "terminal.right-action",
      slot: "right.header.actions",
      order: 10,
      node: toggleButton("Toggle terminal drawer (Ctrl+J)", state.visible, PanelBottom, toggle),
    });
    context.ui.surfaces.register({
      id: "terminal",
      label: "Terminal",
      description: "Start a shell in this workspace.",
      icon: "terminal",
      order: 20,
      open: () => controller.show(),
    });
    context.ui.commands.register({
      id: "terminal.toggle",
      label: "View: Toggle Terminal",
      keybinding: "Ctrl+J",
      run: () => controller.toggle(),
    });
    context.runtime.subscribe((event) => controller.onEvent(event));
    await controller.initialize();
  },
};

function toggleButton(
  label: string,
  selected: Sig<boolean>,
  buttonIcon: Parameters<typeof icon>[0],
  run: () => void,
  hideWithRightPanel = false,
): HTMLElement {
  return button(
    {
      class: ["icon-button", { active: selected, "right-panel-closed-control": hideWithRightPanel }],
      "aria-label": label,
      "aria-pressed": selected,
      "data-tooltip": label,
      onClick: run,
    },
    icon(buttonIcon, 15),
  );
}

export default extension;

import { button, icon } from "@vaakx-dev/vrui";
import { PanelRightOpen } from "lucide";

import type { UiExtension } from "@sand/extension-api";

import { browserView } from "./browser.ts";
import { changesView } from "./changes.ts";
import { RightController } from "./controller.ts";
import { createRightState } from "./state.ts";
import { rightView } from "./view.ts";

const extension: UiExtension = {
  async activate(context) {
    const state = createRightState();
    const controller = new RightController(context.runtime, context.ui.surfaces, state);

    context.ui.surfaces.register({
      id: "browser",
      label: "Browser",
      description: "Open a local app or URL.",
      icon: "browser",
      order: 10,
      multiple: true,
      render: () => browserView(state),
    });
    context.ui.surfaces.register({
      id: "changes",
      label: "Diff",
      description: "Review workspace changes.",
      icon: "changes",
      order: 40,
      render: () => changesView(state),
    });

    context.ui.slots.register({
      id: "right-sidebar.panel",
      slot: "workbench.right",
      node: rightView(controller, state, context.ui.slots, context.ui.surfaces),
    });
    context.ui.slots.register({
      id: "right-sidebar.topbar",
      slot: "workbench.topbar.actions",
      order: 20,
      node: button(
        {
          class: ["icon-button", "right-panel-closed-control", { active: state.open }],
          "aria-label": "Toggle right panel",
          "aria-pressed": state.open,
          "data-tooltip": "Toggle right panel",
          onClick: () => controller.toggle(),
        },
        icon(PanelRightOpen, 15),
      ),
    });

    context.ui.surfaces.onOpen((surface) => controller.openSurface(surface));
    context.ui.surfaces.subscribe(() => state.surfaces.set(context.ui.surfaces.list()));
    context.ui.events.subscribe((event) => {
      if (event.kind === "layout.center.reveal") state.maximized.set(false);
    });
    context.runtime.subscribe((event) => {
      if (event.kind === "workspace.changed") void controller.refreshGit();
    });
    context.ui.commands.register({
      id: "right-sidebar.toggle",
      label: "View: Toggle Right Panel",
      run: () => controller.toggle(),
    });
    context.ui.commands.register({
      id: "right-sidebar.changes",
      label: "View: Changes",
      keybinding: "Ctrl+Shift+G",
      run: () => context.ui.surfaces.open("changes"),
    });
    await controller.initialize();
  },
};

export default extension;

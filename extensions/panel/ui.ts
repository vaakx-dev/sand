import type { UiExtension } from "@sand/extension-api";

import { workbenchEvents, workbenchSlots } from "../workbench/api.ts";
import { PanelController } from "./controller.ts";
import { createPanelState } from "./state.ts";
import { panelView } from "./view.ts";
import { addAction, maximizeAction, toggleAction } from "./views/actions.ts";

const extension: UiExtension = {
  async activate(context) {
    const state = createPanelState();
    const controller = new PanelController(context.runtime, context.ui.surfaces, state);

    context.ui.slots.register({
      id: "panel.host",
      slot: workbenchSlots.auxiliary,
      node: panelView(controller, state, context.ui.controls),
    });
    context.ui.slots.register({
      id: "panel.add",
      slot: workbenchSlots.layoutActions,
      order: 10,
      node: addAction(controller, state, context.ui.controls),
    });
    context.ui.slots.register({
      id: "panel.maximize",
      slot: workbenchSlots.layoutActions,
      order: 20,
      node: maximizeAction(controller, state, context.ui.controls),
    });
    context.ui.slots.register({
      id: "panel.toggle",
      slot: workbenchSlots.layoutActions,
      order: 40,
      node: toggleAction(controller, state, context.ui.controls),
    });

    context.ui.surfaces.onOpen((surface) => controller.openSurface(surface));
    context.ui.surfaces.subscribe(() => controller.updateSurfaces());
    context.ui.events.subscribe((event) => {
      if (event.kind === "layout.center.reveal") state.maximized.set(false);
      if (event.kind === workbenchEvents.activityChanged && event.payload === "settings") {
        controller.hide();
      }
    });
    context.ui.commands.register({
      id: "panel.toggle",
      label: "View: Toggle Panel",
      run: () => controller.toggle(),
    });
    await controller.initialize();
  },
};

export default extension;

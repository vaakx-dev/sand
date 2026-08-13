import type { UiExtension } from "@sand/extension-api";

import { useUi } from "sand:api/ui";
import { useWorkbench, workbenchEvents, workbenchSlots } from "sand:api/workbench";
import { PanelController } from "./controller.ts";
import { createPanelState } from "./state.ts";
import { panelView } from "./view.ts";
import { addAction, maximizeAction, toggleAction } from "./views/actions.ts";

const extension: UiExtension = {
  async activate(context) {
    const ui = useUi(context.apis);
    const workbench = useWorkbench(context.apis);
    const state = createPanelState();
    const controller = new PanelController(context.runtime, workbench.surfaces, state);

    workbench.slots.register({
      id: "panel.host",
      slot: workbenchSlots.auxiliary,
      node: panelView(controller, state, ui),
    });
    workbench.slots.register({
      id: "panel.add",
      slot: workbenchSlots.layoutActions,
      order: 10,
      node: addAction(controller, state, ui),
    });
    workbench.slots.register({
      id: "panel.maximize",
      slot: workbenchSlots.layoutActions,
      order: 20,
      node: maximizeAction(controller, state, ui),
    });
    workbench.slots.register({
      id: "panel.toggle",
      slot: workbenchSlots.layoutActions,
      order: 40,
      node: toggleAction(controller, state, ui),
    });

    workbench.surfaces.onOpen((surface) => controller.openSurface(surface));
    workbench.surfaces.subscribe(() => controller.updateSurfaces());
    workbench.events.subscribe((event) => {
      if (event.kind === "layout.center.reveal") state.maximized.set(false);
      if (event.kind === workbenchEvents.activityChanged && event.payload === "settings") {
        controller.hide();
      }
    });
    workbench.commands.register({
      id: "panel.toggle",
      label: "View: Toggle Panel",
      run: () => controller.toggle(),
    });
    await controller.initialize();
  },
};

export default extension;

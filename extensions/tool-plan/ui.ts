import type { UiExtension } from "@sand/extension-api";

import { PlanController } from "./controller.ts";
import { createPlanState } from "./state.ts";
import { planView } from "./view.ts";

const extension: UiExtension = {
  activate(context) {
    const state = createPlanState();
    const controller = new PlanController(context.runtime, context.ui.surfaces, state);

    context.ui.surfaces.register({
      id: "plan",
      label: "Plan",
      description: "Show agent steps and tool activity.",
      icon: "plan",
      order: 15,
      render: () => planView(state),
    });
    context.ui.events.subscribe((event) => controller.onUiEvent(event));
    context.runtime.subscribe((event) => controller.onRuntimeEvent(event));
  },
};

export default extension;

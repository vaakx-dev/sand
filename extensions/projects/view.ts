import { div, show } from "@vaakx-dev/vrui";

import type { UiControls } from "@sand/extension-api";

import type { ProjectsController } from "./controller.ts";
import type { ProjectsState } from "./state.ts";
import { projectPicker } from "./views/picker.ts";
import { projectSource } from "./views/source.ts";

export function projectOverlays(
  controller: ProjectsController,
  state: ProjectsState,
  controls: UiControls,
): HTMLElement {
  return div(
    { class: "project-overlays" },
    show(state.pickerOpen, () => projectPicker(controller, state, controls)),
    show(state.sourceOpen, () => projectSource(controller, state, controls)),
  );
}

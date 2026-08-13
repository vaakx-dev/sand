import { div, show } from "@vaakx-dev/vrui";

import type { ProjectsController } from "./controller.ts";
import type { ProjectsState } from "./state.ts";
import { projectPicker } from "./views/picker.ts";
import { projectSource } from "./views/source.ts";
import type { SandUi } from "sand:api/ui";

export function projectOverlays(
  controller: ProjectsController,
  state: ProjectsState,
  controls: SandUi,
): HTMLElement {
  return div(
    {},
    show(state.pickerOpen, () => projectPicker(controller, state, controls)),
    show(state.sourceOpen, () => projectSource(controller, state, controls)),
  );
}

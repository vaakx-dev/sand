import { div, show } from "@vaakx-dev/vrui";

import type { WorkbenchController } from "../controller.ts";
import type { WorkbenchState } from "../state.ts";
import { projectPicker } from "./projects/picker.ts";
import { projectSource } from "./projects/source.ts";

export function projectOverlays(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  return div(
    { class: "project-overlays" },
    show(state.projectPickerOpen, () => projectPicker(controller, state)),
    show(state.projectSourceOpen, () => projectSource(controller, state)),
  );
}

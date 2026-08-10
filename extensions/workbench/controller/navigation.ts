import type { UiEventRegistry } from "@sand/extension-api";

import { workbenchEvents } from "../api.ts";
import type { Activity } from "../models.ts";
import type { WorkbenchState } from "../state.ts";

export class NavigationController {
  constructor(
    private readonly events: UiEventRegistry,
    private readonly state: WorkbenchState,
  ) {}

  show(activity: Activity): void {
    if (this.state.activity.get() === activity) return;
    this.state.activity.set(activity);
    this.events.emit(workbenchEvents.activityChanged, activity);
  }
}

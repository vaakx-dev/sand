import type { UiExtensionContext } from "@sand/extension-api";

import type { WorkbenchService } from "./api.ts";
import type { WorkbenchState } from "./state.ts";
import { WorkbenchEvents } from "./controller/events.ts";
import { initializeWorkbench } from "./controller/initialize.ts";
import { ModelsController } from "./controller/models.ts";
import { NavigationController } from "./controller/navigation.ts";
import { PreferencesController } from "./controller/preferences.ts";
import { ProvidersController } from "./controller/providers.ts";
import { RunController } from "./controller/run.ts";
import { ControllerRuntime } from "./controller/runtime.ts";
import { SelectionController } from "./controller/selection.ts";
import { ThreadController } from "./threads/controller.ts";

export class WorkbenchController {
  readonly runs: RunController;
  readonly threads: ThreadController;
  readonly models: ModelsController;
  readonly navigation: NavigationController;
  readonly selection: SelectionController;
  readonly preferences: PreferencesController;
  readonly providers: ProvidersController;

  private readonly runtime: ControllerRuntime;
  private readonly events: WorkbenchEvents;
  private readonly commands: WorkbenchService["commands"];

  constructor(
    context: UiExtensionContext,
    workbench: WorkbenchService,
    private readonly state: WorkbenchState,
  ) {
    this.commands = workbench.commands;
    this.runtime = new ControllerRuntime(context, workbench, state);
    this.models = new ModelsController(this.runtime);
    this.navigation = new NavigationController(workbench.events, state);
    this.selection = new SelectionController(this.runtime);
    this.runs = new RunController(this.runtime, this.selection);
    this.threads = new ThreadController(this.runtime, this.selection);
    this.preferences = new PreferencesController(this.runtime);
    this.providers = new ProvidersController(this.runtime, (id) => this.selection.selectProvider(id));
    this.events = new WorkbenchEvents(this.runtime);
  }

  async initialize(): Promise<void> {
    await initializeWorkbench(this.runtime);
    this.events.start();
  }

  executeCommand(id: string): Promise<void> {
    return this.commands.execute(id);
  }

  toggleSidebar(): void {
    this.state.sidebarOpen.toggle()();
    void this.preferences.saveLayout();
  }
}

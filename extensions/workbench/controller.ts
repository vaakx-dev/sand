import type { UiExtensionContext } from "@sand/extension-api";

import type { WorkbenchState } from "./state.ts";
import { AgentController } from "./controller/agent.ts";
import { ExternalController } from "./controller/external.ts";
import { WorkbenchEvents } from "./controller/events.ts";
import { GitController } from "./controller/git.ts";
import { initializeWorkbench } from "./controller/initialize.ts";
import { ModelsController } from "./controller/models.ts";
import { PreferencesController } from "./controller/preferences.ts";
import { ProjectsController } from "./controller/projects.ts";
import { ProvidersController } from "./controller/providers.ts";
import { ControllerRuntime } from "./controller/runtime.ts";

export class WorkbenchController {
  readonly agent: AgentController;
  readonly git: GitController;
  readonly models: ModelsController;
  readonly preferences: PreferencesController;
  readonly projects: ProjectsController;
  readonly providers: ProvidersController;
  readonly external: ExternalController;

  private readonly runtime: ControllerRuntime;
  private readonly events: WorkbenchEvents;
  private readonly commands: UiExtensionContext["ui"]["commands"];

  constructor(context: UiExtensionContext, state: WorkbenchState) {
    this.commands = context.ui.commands;
    this.runtime = new ControllerRuntime(context, state);
    this.git = new GitController(this.runtime);
    this.agent = new AgentController(this.runtime, () => this.git.refresh());
    this.models = new ModelsController(this.runtime);
    this.preferences = new PreferencesController(this.runtime);
    this.projects = new ProjectsController(this.runtime, () => this.agent.newThread());
    this.providers = new ProvidersController(this.runtime, (id) => this.agent.selectProvider(id));
    this.external = new ExternalController(this.runtime);
    this.events = new WorkbenchEvents(this.runtime, this.git);
  }

  async initialize(): Promise<void> {
    await initializeWorkbench(this.runtime);
    this.events.start();
  }

  executeCommand(id: string): Promise<void> {
    return this.commands.execute(id);
  }
}

import {
  errorMessage,
  type RuntimeClient,
  type UiEventRegistry,
  type WorkspaceDescription,
} from "@sand/extension-api";

import { commands, type PickerIntent, type Project } from "./api.ts";
import { cleanPath, samePath } from "./path.ts";
import type { ProjectsState } from "./state.ts";
import { workbenchEvents } from "../workbench/api.ts";

export class ProjectsController {
  constructor(
    private readonly runtime: RuntimeClient,
    private readonly events: UiEventRegistry,
    readonly state: ProjectsState,
  ) {}

  async initialize(): Promise<void> {
    await this.guard(async () => {
      this.state.root.set(cleanPath(this.runtime.workspace().path));
      this.state.items.set(await this.runtime.command<Project[]>(commands.list));
    });
  }

  openPicker(intent: PickerIntent): void {
    this.state.menuOpen.set(false);
    this.state.query.set("");
    this.state.index.set(0);
    this.state.pickerIntent.set(intent);
    this.state.pickerOpen.set(true);
  }

  toggleMenu(): void {
    this.state.pickerOpen.set(false);
    this.state.sourceOpen.set(false);
    this.state.menuOpen.set(!this.state.menuOpen.get());
  }

  openSource(): void {
    this.state.menuOpen.set(false);
    this.state.pickerOpen.set(false);
    this.state.sourceView.set("sources");
    this.state.sourceIndex.set(0);
    this.state.sourceOpen.set(true);
  }

  async select(path: string): Promise<void> {
    const project = cleanPath(path);
    const intent = this.state.pickerIntent.get();
    this.state.pickerOpen.set(false);
    if (samePath(this.state.root.get(), project)) {
      if (intent === "newThread") {
        this.events.emit(workbenchEvents.newThreadSelected, { project });
      }
      return;
    }
    const selected = await this.switchTo(project);
    if (selected && intent === "newThread") {
      this.events.emit(workbenchEvents.newThreadSelected, { project });
    }
  }

  async chooseLocal(): Promise<void> {
    const path = await this.guard(async () => {
      const path = await this.runtime.command<string>(commands.pick);
      if (!path) return "";
      this.state.items.set(await this.runtime.command<Project[]>(commands.add, { path }));
      return path;
    });
    if (path) await this.switchTo(path);
  }

  async clone(): Promise<void> {
    const url = this.state.cloneUrl.get().trim();
    if (!url) return;
    const project = await this.guard(async () => {
      const parent = await this.runtime.command<string>(commands.pick);
      if (!parent) return "";
      const result = await this.runtime.command<{ project: Project; projects: Project[] }>(
        commands.clone,
        { url, parent },
      );
      this.state.items.set(result.projects);
      return result.project.path;
    });
    if (project) await this.switchTo(project);
  }

  async switchTo(path: string): Promise<boolean> {
    this.state.pickerOpen.set(false);
    this.state.sourceOpen.set(false);
    const workspace = cleanPath(path);
    if (samePath(this.state.root.get(), workspace)) return true;
    const opened = await this.guard(async () => {
      await this.runtime.openWorkspace(workspace);
      return true;
    });
    return opened === true;
  }

  onWorkspaceSelected(workspace: WorkspaceDescription): void {
    this.state.root.set(cleanPath(workspace.path));
    this.state.menuOpen.set(false);
    this.state.pickerOpen.set(false);
    this.state.sourceOpen.set(false);
    void this.refresh();
  }

  private async refresh(): Promise<void> {
    await this.guard(async () => {
      this.state.items.set(await this.runtime.command<Project[]>(commands.list));
    });
  }

  private async guard<Result>(task: () => Promise<Result>): Promise<Result | undefined> {
    try {
      const result = await task();
      this.state.error.set("");
      return result;
    } catch (error) {
      this.state.error.set(errorMessage(error));
      return undefined;
    }
  }
}

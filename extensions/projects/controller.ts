import { invoke } from "@tauri-apps/api/core";

import { errorMessage, type RuntimeClient, type UiEventRegistry } from "@sand/extension-api";

import { commands, type PickerIntent, type Project } from "./api.ts";
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
      const [runtime, projects] = await Promise.all([
        this.runtime.call<{ workspace: string }>("runtime.info"),
        this.runtime.command<Project[]>(commands.list),
      ]);
      this.state.root.set(runtime.workspace);
      this.state.items.set(projects);
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
    const intent = this.state.pickerIntent.get();
    this.state.pickerOpen.set(false);
    if (samePath(this.state.root.get(), path)) {
      if (intent === "newThread") {
        this.events.emit(workbenchEvents.newThreadSelected, { project: path });
      }
      return;
    }
    await this.switchTo(path);
  }

  async chooseLocal(): Promise<void> {
    await this.guard(async () => {
      const path = await this.runtime.command<string>(commands.pick);
      if (!path) return;
      this.state.items.set(await this.runtime.command<Project[]>(commands.add, { path }));
      await this.switchTo(path);
    });
  }

  async clone(): Promise<void> {
    const url = this.state.cloneUrl.get().trim();
    if (!url) return;
    await this.guard(async () => {
      const parent = await this.runtime.command<string>(commands.pick);
      if (!parent) return;
      const result = await this.runtime.command<{ project: Project; projects: Project[] }>(
        commands.clone,
        { url, parent },
      );
      this.state.items.set(result.projects);
      await this.switchTo(result.project.path);
    });
  }

  async switchTo(path: string): Promise<void> {
    this.state.pickerOpen.set(false);
    this.state.sourceOpen.set(false);
    await invoke("switch_workspace", { path });
  }

  private async guard(task: () => Promise<void>): Promise<void> {
    try {
      await task();
      this.state.error.set("");
    } catch (error) {
      this.state.error.set(errorMessage(error));
    }
  }
}

export function samePath(left: string, right: string): boolean {
  return left.localeCompare(right, undefined, { sensitivity: "accent" }) === 0;
}

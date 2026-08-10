import { invoke } from "@tauri-apps/api/core";

import type { ProjectDescription, ProjectPickerIntent } from "../models.ts";
import { ControllerRuntime } from "./runtime.ts";

export class ProjectsController {
  constructor(
    private readonly runtime: ControllerRuntime,
    private readonly newSession: () => void,
  ) {}

  openPicker(intent: ProjectPickerIntent): void {
    const state = this.runtime.state;
    state.projectMenuOpen.set(false);
    state.projectQuery.set("");
    state.projectIndex.set(0);
    state.projectPickerIntent.set(intent);
    state.projectPickerOpen.set(true);
  }

  async select(path: string): Promise<void> {
    const state = this.runtime.state;
    const intent = state.projectPickerIntent.get();
    state.projectPickerOpen.set(false);
    if (samePath(state.root.get(), path)) {
      if (intent === "newThread") this.newSession();
      return;
    }
    await this.switchTo(path);
  }

  async chooseLocal(): Promise<void> {
    await this.runtime.guard(async () => {
      const path = await this.runtime.command<string>("projects.pick");
      if (!path) return;
      this.runtime.state.projects.set(
        await this.runtime.command<ProjectDescription[]>("projects.add", { path }),
      );
      await this.switchTo(path);
    });
  }

  async clone(): Promise<void> {
    const url = this.runtime.state.projectCloneUrl.get().trim();
    if (!url) return;
    await this.runtime.guard(async () => {
      const parent = await this.runtime.command<string>("projects.pick");
      if (!parent) return;
      const result = await this.runtime.command<{
        project: ProjectDescription;
        projects: ProjectDescription[];
      }>("projects.clone", { url, parent });
      this.runtime.state.projects.set(result.projects);
      await this.switchTo(result.project.path);
    });
  }

  async switchTo(path: string): Promise<void> {
    this.runtime.state.projectPickerOpen.set(false);
    this.runtime.state.projectSourceOpen.set(false);
    await invoke("switch_workspace", { path });
  }
}

function samePath(left: string, right: string): boolean {
  return left.localeCompare(right, undefined, { sensitivity: "accent" }) === 0;
}

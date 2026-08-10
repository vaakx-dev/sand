import {
  errorMessage,
  numberValue,
  type JsonValue,
  type RuntimeClient,
  type UiSurfaceContribution,
  type UiSurfaceRegistry,
} from "@sand/extension-api";

import type { GitState } from "./models.ts";
import type { RightState } from "./state.ts";

export class RightController {
  constructor(
    private readonly runtime: RuntimeClient,
    private readonly surfaces: UiSurfaceRegistry,
    readonly state: RightState,
  ) {}

  async initialize(): Promise<void> {
    const settings = await this.runtime.call<Record<string, JsonValue>>("settings.all");
    this.state.width.set(numberValue(settings["right-sidebar.width"], 430));
    this.state.surfaces.set(this.surfaces.list());
    await this.refreshGit();
  }

  toggle(): void {
    this.state.open.get() ? this.hide() : this.state.open.set(true);
  }

  hide(): void {
    this.state.addOpen.set(false);
    this.state.maximized.set(false);
    this.state.open.set(false);
  }

  toggleMaximized(): void {
    this.state.maximized.toggle()();
  }

  openSurface(surface: UiSurfaceContribution): void {
    if (!surface.render) return;
    const existing = surface.multiple
      ? undefined
      : this.state.tabs.get().find((tab) => tab.surface.id === surface.id);
    const id = existing?.id ?? `${surface.id}-${crypto.randomUUID()}`;
    if (!existing) {
      this.state.tabs.update((tabs) => [...tabs, { id, surface, node: surface.render!(id) }]);
    }
    this.state.activeId.set(id);
    this.state.addOpen.set(false);
    this.state.open.set(true);
    if (surface.id === "changes") void this.refreshGit();
  }

  closeTab(id: string): void {
    const tabs = this.state.tabs.get();
    const index = tabs.findIndex((tab) => tab.id === id);
    if (index < 0) return;
    const remaining = tabs.filter((tab) => tab.id !== id);
    this.state.tabs.set(remaining);
    if (this.state.activeId.get() === id) {
      this.state.activeId.set(remaining[Math.min(index, remaining.length - 1)]?.id ?? null);
    }
  }

  async refreshGit(): Promise<void> {
    await this.guard(async () => {
      const [status, diff] = await Promise.all([
        this.command<{ repository: boolean; output: string; error: string }>("git.status"),
        this.command<{ repository: boolean; diff: string; error: string }>("git.diff"),
      ]);
      const git: GitState = {
        repository: status.repository,
        status: status.output || status.error,
        diff: diff.diff || diff.error,
      };
      this.state.gitRepository.set(git.repository);
      this.state.gitStatus.set(git.status);
      this.state.gitDiff.set(git.diff);
    });
  }

  saveWidth(): void {
    void this.runtime.call("settings.set", { key: "right-sidebar.width", value: this.state.width.get() });
  }

  private command<T = JsonValue>(id: string, params: JsonValue = null): Promise<T> {
    return this.runtime.call<T>("commands.execute", { id, params });
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

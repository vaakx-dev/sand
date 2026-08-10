import type { FileTreeNode, SearchResult } from "../models.ts";
import { ControllerRuntime } from "./runtime.ts";

export class WorkspaceController {
  constructor(private readonly runtime: ControllerRuntime) {}

  async refreshTree(): Promise<void> {
    await this.runtime.guard(async () => {
      this.runtime.state.tree.set(
        await this.runtime.command<FileTreeNode[]>("workspace.tree", { depth: 6 }),
      );
    });
  }

  async openFile(path: string): Promise<void> {
    const state = this.runtime.state;
    const existing = state.tabs.get().find((tab) => tab.path === path);
    if (existing) {
      state.activePath.set(path);
      return;
    }
    await this.runtime.guard(async () => {
      const content = await this.runtime.command<string>("workspace.read", { path });
      const name = path.split(/[\\/]/).at(-1) || path;
      state.tabs.update((tabs) => [...tabs, { path, name, content, savedContent: content }]);
      state.activePath.set(path);
    });
  }

  updateActive(content: string): void {
    const state = this.runtime.state;
    const path = state.activePath.get();
    if (!path) return;
    state.tabs.update((tabs) => tabs.map((tab) => tab.path === path ? { ...tab, content } : tab));
  }

  async saveActive(): Promise<void> {
    const state = this.runtime.state;
    const active = state.activeTab.get();
    if (!active) return;
    await this.runtime.guard(async () => {
      await this.runtime.command("workspace.write", { path: active.path, content: active.content });
      state.tabs.update((tabs) => tabs.map((tab) =>
        tab.path === active.path ? { ...tab, savedContent: tab.content } : tab
      ));
      this.runtime.notice(`Saved ${active.name}`);
    });
  }

  closeTab(path: string): void {
    const state = this.runtime.state;
    const tabs = state.tabs.get();
    const index = tabs.findIndex((tab) => tab.path === path);
    const next = tabs.filter((tab) => tab.path !== path);
    state.tabs.set(next);
    if (state.activePath.get() === path) {
      state.activePath.set(next[Math.min(index, next.length - 1)]?.path ?? null);
    }
  }

  async search(): Promise<void> {
    const state = this.runtime.state;
    const query = state.searchQuery.get().trim();
    if (!query) return;
    await this.runtime.guard(async () => {
      const results = await this.runtime.command<SearchResult[]>("workspace.search", { query });
      state.searchResults.set(results.slice(0, 500));
    });
  }

  async openExternal(target: "vscode" | "explorer"): Promise<void> {
    await this.runtime.guard(async () => {
      await this.runtime.command(`workspace.open.${target}`);
      this.runtime.state.openMenuOpen.set(false);
    });
  }
}

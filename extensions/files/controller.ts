import {
  errorMessage,
  objectValue,
  stringValue,
  type JsonValue,
  type RuntimeClient,
  type RuntimeEvent,
  type UiEvent,
  type UiSurfaceRegistry,
  type WorkspaceDescription,
} from "@sand/extension-api";

import { commands, type FileNode, type SearchResult } from "./api.ts";
import type { FilesState } from "./state.ts";

export class FilesController {
  constructor(
    private readonly runtime: RuntimeClient,
    private readonly surfaces: UiSurfaceRegistry,
    readonly state: FilesState,
  ) {}

  async initialize(): Promise<void> {
    await this.guard(() => this.runtime.runWorkspace(async (workspace) => {
      const tree = await workspace.command<FileNode[]>(commands.tree, { depth: 8 });
      workspace.commit(() => {
        this.state.root.set(workspace.workspace.path);
        this.state.tree.set(tree);
      });
    }));
  }

  async show(): Promise<void> {
    await this.surfaces.open("files");
  }

  async refresh(): Promise<void> {
    await this.guard(() => this.runtime.runWorkspace(async (workspace) => {
      const tree = await workspace.command<FileNode[]>(commands.tree, { depth: 8 });
      workspace.commit(() => this.state.tree.set(tree));
    }));
  }

  toggleDirectory(path: string): void {
    this.state.expanded.update((expanded) => ({ ...expanded, [path]: !expanded[path] }));
  }

  async open(path: string): Promise<void> {
    const existing = this.state.tabs.get().find((file) => file.path === path);
    if (existing) {
      this.state.activePath.set(path);
      await this.show();
      return;
    }
    await this.guard(async () => {
      const content = await this.runtime.command<string>(commands.read, { path });
      const name = path.split(/[\\/]/u).at(-1) || path;
      this.state.tabs.update((tabs) => [...tabs, { path, name, content, savedContent: content }]);
      this.state.activePath.set(path);
      await this.show();
    });
  }

  update(path: string, content: string): void {
    this.state.tabs.update((tabs) => tabs.map((file) =>
      file.path === path ? { ...file, content } : file
    ));
  }

  async save(): Promise<void> {
    const file = this.state.activeFile.get();
    if (!file) return;
    await this.guard(async () => {
      await this.runtime.command(commands.write, { path: file.path, content: file.content });
      this.state.tabs.update((tabs) => tabs.map((item) =>
        item.path === file.path ? { ...item, savedContent: item.content } : item
      ));
    });
  }

  close(path: string): void {
    const tabs = this.state.tabs.get();
    const index = tabs.findIndex((file) => file.path === path);
    if (index < 0) return;
    const remaining = tabs.filter((file) => file.path !== path);
    this.state.tabs.set(remaining);
    if (this.state.activePath.get() === path) {
      this.state.activePath.set(remaining[Math.min(index, remaining.length - 1)]?.path ?? null);
    }
  }

  async search(): Promise<void> {
    const query = this.state.query.get().trim();
    if (!query) {
      this.clearSearch();
      return;
    }
    await this.guard(async () => {
      const matches = await this.runtime.command<SearchResult[]>(commands.search, { query });
      this.state.matches.set(matches.slice(0, 500));
      this.state.searchMode.set(true);
    });
  }

  clearSearch(): void {
    this.state.query.set("");
    this.state.matches.set([]);
    this.state.searchMode.set(false);
  }

  onUiEvent(event: UiEvent): void {
    if (event.kind !== "files.open") return;
    const path = stringValue(objectValue(event.payload as JsonValue).path);
    if (path) void this.open(path);
  }

  onRuntimeEvent(event: RuntimeEvent): void {
    if (event.kind === "workspace.changed") {
      void this.refresh();
      const path = stringValue(objectValue(event.payload).path);
      if (path) void this.reloadCleanFile(path);
    }
  }

  onWorkspaceSelected(workspace: WorkspaceDescription): void {
    this.reset(workspace.path);
    void this.initialize();
  }

  private reset(root: string): void {
    this.state.root.set(root);
    this.state.tree.set([]);
    this.state.expanded.set({});
    this.state.tabs.set([]);
    this.state.activePath.set(null);
    this.clearSearch();
    this.state.error.set("");
  }

  private async reloadCleanFile(path: string): Promise<void> {
    const file = this.state.tabs.get().find((item) => item.path === path);
    if (!file || file.content !== file.savedContent) return;
    await this.guard(async () => {
      const content = await this.runtime.command<string>(commands.read, { path });
      this.state.tabs.update((tabs) => tabs.map((item) =>
        item.path === path ? { ...item, content, savedContent: content } : item
      ));
    });
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

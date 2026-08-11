import { invoke } from "@tauri-apps/api/core";

import type {
  JsonValue,
  RuntimeClient,
  RuntimeEvent,
  WorkspaceDescription,
  WorkspaceScope,
} from "@sand/extension-api";

import { Workspaces } from "./workspaces.ts";

export class Client implements RuntimeClient {
  private readonly listeners = new Set<(event: RuntimeEvent) => void>();
  private readonly workspaces = new Workspaces();
  private lastEvent = 0;

  async start(): Promise<void> {
    this.workspaces.select(await invoke<WorkspaceDescription>("workspace_active"));
    void this.poll();
  }

  workspace(): WorkspaceDescription {
    return this.workspaces.active();
  }

  async openWorkspace(path: string): Promise<WorkspaceDescription> {
    const workspace = await invoke<WorkspaceDescription>("workspace_open", { path });
    this.select(workspace);
    return workspace;
  }

  async closeWorkspace(id: string): Promise<WorkspaceDescription> {
    const workspace = await invoke<WorkspaceDescription>("workspace_close", { id });
    if (this.workspace().id === id) this.select(workspace);
    return workspace;
  }

  async runWorkspace(task: (scope: WorkspaceScope) => Promise<void>): Promise<void> {
    await this.workspaces.run(
      (workspaceId, method, params) => this.callWorkspace(workspaceId, method, params),
      task,
    );
  }

  call<T = JsonValue>(method: string, params: JsonValue = null): Promise<T> {
    return this.callWorkspace(this.workspace().id, method, params);
  }

  command<T = JsonValue>(id: string, params: JsonValue = null): Promise<T> {
    return this.call<T>("commands.execute", { id, params });
  }

  subscribe(listener: (event: RuntimeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeWorkspace(listener: (workspace: WorkspaceDescription) => void): () => void {
    return this.workspaces.subscribe(listener);
  }

  private select(workspace: WorkspaceDescription): void {
    this.workspaces.select(workspace);
  }

  private callWorkspace<T>(workspaceId: string, method: string, params: JsonValue): Promise<T> {
    return invoke<T>("runtime_call", { workspaceId: workspaceId, method, params });
  }

  private emit(event: RuntimeEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  private async poll(): Promise<void> {
    while (true) {
      try {
        const events = await invoke<RuntimeEvent[]>("runtime_events", { after: this.lastEvent });
        for (const event of events) {
          this.lastEvent = Math.max(this.lastEvent, event.seq);
          if (!event.workspaceId || event.workspaceId === this.workspace().id) this.emit(event);
        }
      } catch (error) {
        console.error("runtime event polling failed", error);
      }
      await new Promise((resolve) => window.setTimeout(resolve, 60));
    }
  }
}

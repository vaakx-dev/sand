import type { JsonValue } from "./json.ts";

export interface WorkspaceDescription {
  id: string;
  path: string;
  home: string;
}

export interface RuntimeInfo {
  appRoot: string;
  home: string;
  cache: string;
  bun: string;
  workspace: WorkspaceDescription;
}

export interface RuntimeCalls {
  call<T = JsonValue>(method: string, params?: JsonValue): Promise<T>;
  command<T = JsonValue>(id: string, params?: JsonValue): Promise<T>;
}

export interface WorkspaceScope extends RuntimeCalls {
  readonly workspace: WorkspaceDescription;
  commit(update: () => void): void;
}

export interface RuntimeEvent<T = JsonValue> {
  seq: number;
  workspaceId?: string;
  kind: string;
  payload: T;
}

export interface RuntimeClient extends RuntimeCalls {
  workspace(): WorkspaceDescription;
  openWorkspace(path: string): Promise<WorkspaceDescription>;
  closeWorkspace(id: string): Promise<WorkspaceDescription>;
  runWorkspace(task: (scope: WorkspaceScope) => Promise<void>): Promise<void>;
  subscribe(listener: (event: RuntimeEvent) => void): () => void;
  subscribeWorkspace(listener: (workspace: WorkspaceDescription) => void): () => void;
}

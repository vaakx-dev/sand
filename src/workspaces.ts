import type {
  JsonValue,
  WorkspaceDescription,
  WorkspaceScope,
} from "@sand/extension-api";

type WorkspaceRequest = (
  workspaceId: string,
  method: string,
  params: JsonValue,
) => Promise<unknown>;

export class Workspaces {
  private readonly listeners = new Set<(workspace: WorkspaceDescription) => void>();
  private current?: WorkspaceDescription;

  active(): WorkspaceDescription {
    if (!this.current) throw new Error("the runtime has not started");
    return this.current;
  }

  select(workspace: WorkspaceDescription): void {
    this.current = workspace;
    for (const listener of this.listeners) listener(workspace);
  }

  subscribe(listener: (workspace: WorkspaceDescription) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async run(
    request: WorkspaceRequest,
    task: (scope: WorkspaceScope) => Promise<void>,
  ): Promise<void> {
    const workspace = this.active();
    const assertActive = () => {
      if (this.current?.id !== workspace.id) throw new StaleWorkspace();
    };
    const call = async <T>(method: string, params: JsonValue = null): Promise<T> => {
      assertActive();
      const result = await request(workspace.id, method, params);
      assertActive();
      return result as T;
    };
    const scope: WorkspaceScope = {
      workspace,
      call,
      command: (id, params = null) => call("commands.execute", { id, params }),
      commit(update) {
        assertActive();
        update();
      },
    };
    try {
      await task(scope);
      assertActive();
    } catch (error) {
      if (!(error instanceof StaleWorkspace) && this.current?.id === workspace.id) throw error;
    }
  }
}

class StaleWorkspace extends Error {}

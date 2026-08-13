import { batch } from "@vaakx-dev/vrui";

import {
  errorMessage,
  objectValue,
  stringValue,
  type RuntimeClient,
  type RuntimeEvent,
} from "@sand/extension-api";

import { commands, type Diff, type Status } from "./api.ts";
import type { GitState } from "./state.ts";
import { workbenchEvents, type UiEvent, type UiSurfaceRegistry } from "sand:api/workbench";

export class GitController {
  constructor(
    private readonly runtime: RuntimeClient,
    private readonly surfaces: UiSurfaceRegistry,
    readonly state: GitState,
  ) {}

  available(): boolean {
    return this.state.repository.get();
  }

  async refresh(): Promise<void> {
    try {
      await this.runtime.runWorkspace(async (workspace) => {
        const threadId = this.state.threadId.get();
        const [status, diff] = await Promise.all([
          workspace.command<Status>(commands.status),
          workspace.command<Diff>(commands.diff),
        ]);
        if (threadId) {
          await workspace.command("threads.changeRequest", {
            threadId,
            ...(status.changeRequestState ? { state: status.changeRequestState } : {}),
          });
        }
        workspace.commit(() => batch(() => {
          this.state.repository.set(status.repository);
          this.state.status.set(status.output || status.error);
          this.state.diff.set(diff.diff || diff.error);
          this.state.error.set("");
        }));
      });
    } catch (error) {
      this.state.error.set(errorMessage(error));
    }
    this.surfaces.refresh();
  }

  async initialize(): Promise<void> {
    try {
      await this.runtime.command(commands.initialize);
      await this.refresh();
    } catch (error) {
      this.state.error.set(errorMessage(error));
    }
  }

  onRuntimeEvent(event: RuntimeEvent): void {
    if (event.kind === "workspace.changed") void this.refresh();
  }

  onWorkspaceSelected(): void {
    this.state.threadId.set(null);
    void this.refresh();
  }

  onUiEvent(event: UiEvent): void {
    if (event.kind !== workbenchEvents.threadChanged) return;
    this.state.threadId.set(stringValue(objectValue(event.payload).threadId) || null);
    void this.refresh();
  }
}

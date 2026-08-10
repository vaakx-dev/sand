import { batch } from "@vaakx-dev/vrui";

import {
  errorMessage,
  objectValue,
  stringValue,
  type RuntimeClient,
  type RuntimeEvent,
  type UiEvent,
  type UiSurfaceRegistry,
} from "@sand/extension-api";

import { commands, type Diff, type Status } from "./api.ts";
import type { GitState } from "./state.ts";
import { workbenchEvents } from "../workbench/api.ts";

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
      const [status, diff] = await Promise.all([
        this.runtime.command<Status>(commands.status),
        this.runtime.command<Diff>(commands.diff),
      ]);
      batch(() => {
        this.state.repository.set(status.repository);
        this.state.status.set(status.output || status.error);
        this.state.diff.set(diff.diff || diff.error);
        this.state.error.set("");
      });
      await this.syncThread(status);
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

  onUiEvent(event: UiEvent): void {
    if (event.kind !== workbenchEvents.threadChanged) return;
    this.state.threadId.set(stringValue(objectValue(event.payload).threadId) || null);
    void this.refresh();
  }

  private async syncThread(status: Status): Promise<void> {
    const threadId = this.state.threadId.get();
    if (!threadId) return;
    await this.runtime.command("threads.changeRequest", {
      threadId,
      ...(status.changeRequestState ? { state: status.changeRequestState } : {}),
    });
  }
}

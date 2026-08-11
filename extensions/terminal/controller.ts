import { batch } from "@vaakx-dev/vrui";

import {
  errorMessage,
  numberValue,
  objectValue,
  stringValue,
  withoutKey,
  type JsonValue,
  type RuntimeClient,
  type RuntimeEvent,
  type WorkspaceDescription,
  type WorkspaceScope,
} from "@sand/extension-api";

import { commands } from "./api.ts";
import type { TerminalPane, TerminalSnapshot, TerminalStream } from "./models.ts";
import type { TerminalState } from "./state.ts";

export class TerminalController {
  private lineId = 1;
  private readonly openByWorkspace = new Map<string, boolean>();
  private initialization: Promise<void> = Promise.resolve();

  constructor(
    private readonly runtime: RuntimeClient,
    readonly state: TerminalState,
  ) {}

  initialize(): Promise<void> {
    this.state.loading.set(true);
    this.initialization = this.load();
    return this.initialization;
  }

  async toggle(): Promise<void> {
    if (this.state.open.get()) {
      this.hide();
      return;
    }
    await this.show();
  }

  async show(): Promise<void> {
    this.setOpen(this.runtime.workspace(), true);
    const initialization = this.initialization;
    await this.runtime.runWorkspace(async (workspace) => {
      await initialization;
      let shouldCreate = false;
      workspace.commit(() => {
        shouldCreate = this.state.open.get()
          && !this.state.opening.get()
          && this.state.panes.get().length === 0;
      });
      if (shouldCreate) await this.open(workspace);
    });
  }

  hide(): void {
    this.setOpen(this.runtime.workspace(), false);
  }

  async create(layout?: "columns" | "rows"): Promise<void> {
    this.setOpen(this.runtime.workspace(), true);
    const initialization = this.initialization;
    await this.runtime.runWorkspace(async (workspace) => {
      await initialization;
      await this.open(workspace, layout);
    });
  }

  async write(id: string): Promise<void> {
    const command = this.state.commands.get()[id] ?? "";
    if (!command.trim()) return;
    this.state.commands.update((commands) => ({ ...commands, [id]: "" }));
    this.state.ready.update((ready) => ({ ...ready, [id]: false }));
    await this.guard(async () => {
      const written = await this.runtime.command<boolean>(commands.write, { id, data: command });
      if (written) return;
      this.state.ready.update((ready) => ({ ...ready, [id]: true }));
      this.state.error.set("Terminal is no longer running");
    });
  }

  async close(id: string): Promise<void> {
    await this.guard(async () => {
      await this.runtime.command(commands.close, { id });
    });
    const panes = this.state.panes.get().filter((pane) => pane.id !== id);
    batch(() => {
      this.state.panes.set(panes);
      this.state.lines.update((lines) => lines.filter((line) => line.terminalId !== id));
      this.state.commands.update((commands) => withoutKey(commands, id));
      this.state.ready.update((ready) => withoutKey(ready, id));
      this.state.activeId.set(panes.at(-1)?.id ?? null);
      if (panes.length === 0) this.state.open.set(false);
    });
  }

  onEvent(event: RuntimeEvent): void {
    const payload = objectValue(event.payload);
    if (event.kind === "terminal.output") {
      this.append(
        stringValue(payload.id),
        terminalStream(stringValue(payload.stream)),
        stringValue(payload.text),
      );
    }
    if (event.kind === "terminal.exit") {
      this.exited(stringValue(payload.id));
    }
  }

  onWorkspaceSelected(workspace: WorkspaceDescription): void {
    this.reset(this.openByWorkspace.get(workspace.id) ?? false);
    void this.initialize();
  }

  private reset(open: boolean): void {
    batch(() => {
      this.state.open.set(open);
      this.state.loading.set(true);
      this.state.opening.set(false);
      this.state.panes.set([]);
      this.state.activeId.set(null);
      this.state.commands.set({});
      this.state.ready.set({});
      this.state.lines.set([]);
      this.state.error.set("");
    });
  }

  private async load(): Promise<void> {
    await this.runtime.runWorkspace(async (workspace) => {
      try {
        const [settings, terminal] = await Promise.all([
          workspace.call<Record<string, JsonValue>>("settings.all"),
          workspace.command<TerminalSnapshot>(commands.list),
        ]);
        const commandsById = Object.fromEntries(terminal.panes.map((pane) => [pane.id, ""]));
        const ready = Object.fromEntries(
          terminal.panes.map((pane) => [pane.id, pane.status === "running"]),
        );
        workspace.commit(() => batch(() => {
          this.state.height.set(numberValue(settings["terminal.height"], 260));
          this.state.panes.set(terminal.panes);
          this.state.lines.set(terminal.output.map((output) => ({
            id: this.lineId++,
            ...output,
          })));
          this.state.commands.set(commandsById);
          this.state.ready.set(ready);
          this.state.activeId.set(terminal.panes.at(-1)?.id ?? null);
          this.state.loading.set(false);
          this.state.error.set("");
        }));
      } catch (error) {
        workspace.commit(() => batch(() => {
          this.state.loading.set(false);
          this.state.error.set(errorMessage(error));
        }));
      }
    });
  }

  private async open(
    workspace: WorkspaceScope,
    layout?: "columns" | "rows",
  ): Promise<void> {
    let opening = false;
    workspace.commit(() => batch(() => {
      if (this.state.opening.get()) return;
      opening = true;
      if (layout) this.state.layout.set(layout);
      this.state.opening.set(true);
    }));
    if (!opening) return;
    try {
      const pane = await workspace.command<Omit<TerminalPane, "status">>(commands.open);
      workspace.commit(() => batch(() => {
        this.state.panes.update((panes) => [...panes, { ...pane, status: "running" }]);
        this.state.commands.update((commands) => ({ ...commands, [pane.id]: "" }));
        this.state.ready.update((ready) => ({ ...ready, [pane.id]: true }));
        this.state.activeId.set(pane.id);
        this.state.error.set("");
      }));
    } catch (error) {
      workspace.commit(() => this.state.error.set(errorMessage(error)));
    } finally {
      workspace.commit(() => batch(() => {
        this.state.opening.set(false);
        if (this.state.panes.get().length === 0) this.setOpen(workspace.workspace, false);
      }));
    }
  }

  private setOpen(workspace: WorkspaceDescription, open: boolean): void {
    this.openByWorkspace.set(workspace.id, open);
    this.state.open.set(open);
  }

  saveHeight(): void {
    void this.runtime.call("settings.set", { key: "terminal.height", value: this.state.height.get() });
  }

  private exited(id: string): void {
    this.state.ready.update((ready) => ({ ...ready, [id]: false }));
    this.state.panes.update((panes) => panes.map((pane) =>
      pane.id === id ? { ...pane, status: "exited" } : pane
    ));
  }

  private append(terminalId: string, stream: TerminalStream, text: string): void {
    if (!terminalId || !text) return;
    if (stream === "prompt") {
      this.state.ready.update((ready) => ({ ...ready, [terminalId]: true }));
    }
    this.state.lines.update((lines) => [
      ...lines.slice(-2_000),
      { id: this.lineId++, terminalId, stream, text },
    ]);
  }

  private async guard(task: () => Promise<void>): Promise<boolean> {
    try {
      await task();
      this.state.error.set("");
      return true;
    } catch (error) {
      this.state.error.set(errorMessage(error));
      return false;
    }
  }
}

function terminalStream(value: string): TerminalStream {
  return value === "command" || value === "stderr" || value === "prompt" || value === "status"
    ? value
    : "stdout";
}

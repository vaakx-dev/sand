import { batch } from "@vaakx-dev/vrui";

import type { TerminalPane } from "../models.ts";
import { ControllerRuntime } from "./runtime.ts";

export class TerminalController {
  private lineId = 1;

  constructor(private readonly runtime: ControllerRuntime) {}

  async toggle(): Promise<void> {
    const state = this.runtime.state;
    if (state.bottomOpen.get()) {
      state.bottomOpen.set(false);
      return;
    }
    await this.show();
  }

  async show(): Promise<void> {
    const state = this.runtime.state;
    state.bottomOpen.set(true);
    if (state.terminalPanes.get().length === 0) await this.create();
  }

  async create(layout?: "columns" | "rows"): Promise<void> {
    const state = this.runtime.state;
    if (layout) state.terminalLayout.set(layout);
    state.bottomOpen.set(true);
    await this.runtime.guard(async () => {
      const pane = await this.runtime.command<Omit<TerminalPane, "status">>("terminal.open");
      state.terminalPanes.update((panes) => [...panes, { ...pane, status: "running" }]);
      state.terminalCommands.update((commands) => ({ ...commands, [pane.id]: "" }));
      state.terminalReady.update((ready) => ({ ...ready, [pane.id]: true }));
      state.terminalActiveId.set(pane.id);
    });
  }

  async write(id: string): Promise<void> {
    const state = this.runtime.state;
    const command = state.terminalCommands.get()[id] ?? "";
    if (!command.trim()) return;
    state.terminalCommands.update((commands) => ({ ...commands, [id]: "" }));
    state.terminalReady.update((ready) => ({ ...ready, [id]: false }));
    let written: boolean | null = null;
    await this.runtime.guard(async () => {
      written = await this.runtime.command<boolean>("terminal.write", { id, data: command });
    });
    if (written === true) return;
    state.terminalReady.update((ready) => ({ ...ready, [id]: true }));
    if (written === false) this.runtime.notice("Terminal is no longer running");
  }

  async close(id: string): Promise<void> {
    const state = this.runtime.state;
    await this.runtime.guard(async () => {
      await this.runtime.command("terminal.close", { id });
    });
    const panes = state.terminalPanes.get().filter((pane) => pane.id !== id);
    batch(() => {
      state.terminalPanes.set(panes);
      state.terminal.update((lines) => lines.filter((line) => line.terminalId !== id));
      state.terminalCommands.update((commands) => {
        const next = { ...commands };
        delete next[id];
        return next;
      });
      state.terminalReady.update((ready) => {
        const next = { ...ready };
        delete next[id];
        return next;
      });
      state.terminalActiveId.set(panes.at(-1)?.id ?? null);
      if (panes.length === 0) state.bottomOpen.set(false);
    });
  }

  exited(id: string, exitCode: number): void {
    this.append(id, "status", `\n[process exited with code ${exitCode}]`);
    this.runtime.state.terminalReady.update((ready) => ({ ...ready, [id]: false }));
    this.runtime.state.terminalPanes.update((panes) => panes.map((pane) =>
      pane.id === id ? { ...pane, status: "exited" } : pane
    ));
  }

  append(
    terminalId: string,
    stream: "command" | "stdout" | "stderr" | "prompt" | "status",
    text: string,
  ): void {
    if (!terminalId || !text) return;
    if (stream === "prompt") {
      this.runtime.state.terminalReady.update((ready) => ({ ...ready, [terminalId]: true }));
    }
    this.runtime.state.terminal.update((lines) => [
      ...lines.slice(-2_000),
      { id: this.lineId++, terminalId, stream, text },
    ]);
  }
}

import { batch } from "@vaakx-dev/vrui";

import {
  errorMessage,
  numberValue,
  objectValue,
  stringValue,
  type JsonValue,
  type RuntimeClient,
  type RuntimeEvent,
} from "@sand/extension-api";

import type { TerminalPane, TerminalStream } from "./models.ts";
import type { TerminalState } from "./state.ts";

export class TerminalController {
  private lineId = 1;

  constructor(
    private readonly runtime: RuntimeClient,
    readonly state: TerminalState,
  ) {}

  async initialize(): Promise<void> {
    const settings = await this.runtime.call<Record<string, JsonValue>>("settings.all");
    this.state.height.set(numberValue(settings["terminal.height"], 260));
  }

  async toggle(): Promise<void> {
    if (this.state.open.get()) {
      this.hide();
      return;
    }
    await this.show();
  }

  async show(): Promise<void> {
    this.state.open.set(true);
    if (this.state.panes.get().length === 0) await this.create();
  }

  hide(): void {
    this.state.open.set(false);
  }

  async create(layout?: "columns" | "rows"): Promise<void> {
    if (this.state.opening.get()) return;
    if (layout) this.state.layout.set(layout);
    this.state.open.set(true);
    this.state.opening.set(true);
    const opened = await this.guard(async () => {
      const pane = await this.command<Omit<TerminalPane, "status">>("terminal.open");
      this.state.panes.update((panes) => [...panes, { ...pane, status: "running" }]);
      this.state.commands.update((commands) => ({ ...commands, [pane.id]: "" }));
      this.state.ready.update((ready) => ({ ...ready, [pane.id]: true }));
      this.state.activeId.set(pane.id);
    });
    batch(() => {
      this.state.opening.set(false);
      if (!opened && this.state.panes.get().length === 0) this.state.open.set(false);
    });
  }

  async write(id: string): Promise<void> {
    const command = this.state.commands.get()[id] ?? "";
    if (!command.trim()) return;
    this.state.commands.update((commands) => ({ ...commands, [id]: "" }));
    this.state.ready.update((ready) => ({ ...ready, [id]: false }));
    await this.guard(async () => {
      const written = await this.command<boolean>("terminal.write", { id, data: command });
      if (written) return;
      this.state.ready.update((ready) => ({ ...ready, [id]: true }));
      this.state.error.set("Terminal is no longer running");
    });
  }

  async close(id: string): Promise<void> {
    await this.guard(async () => {
      await this.command("terminal.close", { id });
    });
    const panes = this.state.panes.get().filter((pane) => pane.id !== id);
    batch(() => {
      this.state.panes.set(panes);
      this.state.lines.update((lines) => lines.filter((line) => line.terminalId !== id));
      this.state.commands.update((commands) => omit(commands, id));
      this.state.ready.update((ready) => omit(ready, id));
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
      this.exited(
        stringValue(payload.id),
        typeof payload.exitCode === "number" ? payload.exitCode : -1,
      );
    }
  }

  saveHeight(): void {
    void this.runtime.call("settings.set", { key: "terminal.height", value: this.state.height.get() });
  }

  private exited(id: string, exitCode: number): void {
    this.append(id, "status", `\n[process exited with code ${exitCode}]`);
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

  private command<T = JsonValue>(id: string, params: JsonValue = null): Promise<T> {
    return this.runtime.call<T>("commands.execute", { id, params });
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

function omit<T>(value: Record<string, T>, key: string): Record<string, T> {
  const next = { ...value };
  delete next[key];
  return next;
}

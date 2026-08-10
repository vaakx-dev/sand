import { invoke } from "@tauri-apps/api/core";

import {
  errorMessage,
  type JsonValue,
  type RuntimeClient,
  type RuntimeEvent,
  type UiBundle,
  type UiCommand,
  type UiExtension,
  type UiRegistry,
} from "@sand/extension-api";

class Commands {
  private readonly commands = new Map<string, UiCommand>();
  private readonly listeners = new Set<() => void>();

  register(command: UiCommand): () => void {
    if (this.commands.has(command.id)) throw new Error(`UI command already registered: ${command.id}`);
    this.commands.set(command.id, command);
    this.notify();
    return () => {
      this.commands.delete(command.id);
      this.notify();
    };
  }

  list(): UiCommand[] {
    return [...this.commands.values()].sort((left, right) => left.label.localeCompare(right.label));
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async execute(id: string): Promise<void> {
    const command = this.commands.get(id);
    if (!command) throw new Error(`unknown UI command: ${id}`);
    await command.run();
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

class Client implements RuntimeClient {
  private readonly listeners = new Set<(event: RuntimeEvent) => void>();
  private lastEvent = 0;
  private stopped = false;

  constructor(active: boolean) {
    if (active) void this.poll();
  }

  call<T = JsonValue>(method: string, params: JsonValue = null): Promise<T> {
    return invoke<T>("runtime_call", { method, params });
  }

  subscribe(listener: (event: RuntimeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async poll(): Promise<void> {
    while (!this.stopped) {
      try {
        const events = await invoke<RuntimeEvent[]>("runtime_events", { after: this.lastEvent });
        for (const event of events) {
          this.lastEvent = Math.max(this.lastEvent, event.seq);
          for (const listener of this.listeners) listener(event);
        }
      } catch (error) {
        console.error("runtime event polling failed", error);
      }
      await new Promise((resolve) => window.setTimeout(resolve, 60));
    }
  }
}

const desktop = "__TAURI_INTERNALS__" in window;
const runtime = new Client(desktop);
const commands = new Commands();
let mounted = false;
const ui: UiRegistry = {
  mount(node) {
    if (mounted) throw new Error("a UI extension already mounted the application root");
    const root = document.getElementById("app");
    if (!root) throw new Error("application root is missing");
    root.replaceChildren(node);
    mounted = true;
  },
  commands,
};

if (desktop) void start();
else showFailure(new Error("the desktop runtime is required; start Sand through Tauri"));

async function start(): Promise<void> {
  try {
    const bundles = await runtime.call<UiBundle[]>("extensions.ui");
    for (const bundle of bundles) await activate(bundle);
    if (!mounted) throw new Error("no enabled UI extension mounted a workbench");
  } catch (error) {
    showFailure(error);
  }
}

async function activate(bundle: UiBundle): Promise<void> {
  for (const source of bundle.styles) {
    const style = document.createElement("style");
    style.dataset.sandExtension = bundle.manifest.id;
    style.textContent = source;
    document.head.append(style);
  }
  if (!bundle.source) return;
  const url = URL.createObjectURL(new Blob([bundle.source], { type: "text/javascript" }));
  try {
    const imported = (await import(/* @vite-ignore */ url)) as {
      default?: UiExtension;
      activate?: UiExtension["activate"];
    };
    const extension = imported.default ?? imported;
    if (typeof extension.activate !== "function") {
      throw new Error(`${bundle.manifest.id} does not export activate()`);
    }
    await extension.activate({ manifest: bundle.manifest, runtime, ui });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function showFailure(error: unknown): void {
  const root = document.getElementById("app");
  if (!root) return;
  const message = errorMessage(error);
  root.textContent = `Sand could not start: ${message}`;
  root.setAttribute(
    "style",
    "box-sizing:border-box;min-height:100vh;padding:32px;background:#111;color:#ddd;font:13px ui-monospace,monospace",
  );
}

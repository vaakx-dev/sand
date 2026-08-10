import { invoke } from "@tauri-apps/api/core";

import {
  errorMessage,
  type JsonValue,
  type RuntimeClient,
  type RuntimeEvent,
  type UiBundle,
  type UiCommand,
  type UiEvent,
  type UiExtension,
  type UiRegistry,
  type UiSlotContribution,
  type UiSurfaceContribution,
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

class Slots {
  private readonly contributions = new Map<string, Map<string, UiSlotContribution>>();
  private readonly mounts = new Map<string, Set<HTMLElement>>();

  register(contribution: UiSlotContribution): () => void {
    const slot = this.contributions.get(contribution.slot) ?? new Map();
    if (slot.has(contribution.id)) throw new Error(`UI slot contribution already registered: ${contribution.id}`);
    slot.set(contribution.id, contribution);
    this.contributions.set(contribution.slot, slot);
    this.sync(contribution.slot);
    return () => {
      slot.delete(contribution.id);
      this.sync(contribution.slot);
    };
  }

  mount(slot: string, container: HTMLElement): () => void {
    const mounts = this.mounts.get(slot) ?? new Set();
    mounts.add(container);
    this.mounts.set(slot, mounts);
    this.sync(slot);
    return () => mounts.delete(container);
  }

  private sync(slot: string): void {
    const nodes = [...(this.contributions.get(slot)?.values() ?? [])]
      .sort((left, right) => (left.order ?? 0) - (right.order ?? 0) || left.id.localeCompare(right.id))
      .map((contribution) => contribution.node);
    for (const mount of this.mounts.get(slot) ?? []) mount.replaceChildren(...nodes);
  }
}

class Surfaces {
  private readonly surfaces = new Map<string, UiSurfaceContribution>();
  private readonly listeners = new Set<() => void>();
  private readonly openListeners = new Set<(surface: UiSurfaceContribution) => void>();

  register(surface: UiSurfaceContribution): () => void {
    if (this.surfaces.has(surface.id)) throw new Error(`UI surface already registered: ${surface.id}`);
    if (!surface.render && !surface.open) throw new Error(`UI surface has no action: ${surface.id}`);
    this.surfaces.set(surface.id, surface);
    this.notify();
    return () => {
      this.surfaces.delete(surface.id);
      this.notify();
    };
  }

  list(): UiSurfaceContribution[] {
    return [...this.surfaces.values()].sort((left, right) =>
      (left.order ?? 0) - (right.order ?? 0) || left.label.localeCompare(right.label)
    );
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async open(id: string): Promise<void> {
    const surface = this.surfaces.get(id);
    if (!surface) throw new Error(`unknown UI surface: ${id}`);
    if (surface.render) {
      for (const listener of this.openListeners) listener(surface);
      return;
    }
    await surface.open?.();
  }

  onOpen(listener: (surface: UiSurfaceContribution) => void): () => void {
    this.openListeners.add(listener);
    return () => this.openListeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

class UiEvents {
  private readonly listeners = new Set<(event: UiEvent) => void>();

  emit<T>(kind: string, payload: T): void {
    for (const listener of this.listeners) listener({ kind, payload });
  }

  subscribe(listener: (event: UiEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

const desktop = "__TAURI_INTERNALS__" in window;
const runtime = new Client(desktop);
const commands = new Commands();
const slots = new Slots();
const surfaces = new Surfaces();
const events = new UiEvents();
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
  slots,
  surfaces,
  events,
};

if (desktop) void start();
else showFailure(new Error("the desktop runtime is required; start Sand through Tauri"));

async function start(): Promise<void> {
  try {
    const bundles = await runtime.call<UiBundle[]>("extensions.ui");
    const failures: string[] = [];
    for (const bundle of bundles) {
      try {
        await activate(bundle);
      } catch (error) {
        const message = `${bundle.manifest.id}: ${errorMessage(error)}`;
        failures.push(message);
        console.error(`UI extension failed: ${message}`);
      }
    }
    if (!mounted) {
      const detail = failures.length ? ` (${failures.join("; ")})` : "";
      throw new Error(`no enabled UI extension mounted a workbench${detail}`);
    }
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

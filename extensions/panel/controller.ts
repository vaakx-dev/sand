import { batch } from "@vaakx-dev/vrui";

import {
  numberValue,
  type JsonValue,
  type RuntimeClient,
} from "@sand/extension-api";

import { SurfaceVisibility } from "./models.ts";
import { normalizeWidth, PANEL_DEFAULT_WIDTH, type PanelState } from "./state.ts";
import type { UiSurfaceContribution, UiSurfaceRegistry } from "sand:api/workbench";

export class PanelController {
  constructor(
    private readonly runtime: RuntimeClient,
    private readonly surfaces: UiSurfaceRegistry,
    readonly state: PanelState,
  ) {}

  async initialize(): Promise<void> {
    const settings = await this.runtime.call<Record<string, JsonValue>>("settings.all");
    this.state.width.set(normalizeWidth(numberValue(settings["panel.width"], PANEL_DEFAULT_WIDTH)));
    this.updateSurfaces();
  }

  toggle(): void {
    if (this.state.open.get()) {
      this.hide();
      return;
    }
    this.state.open.set(true);
    this.syncVisibility();
  }

  hide(): void {
    this.state.addOpen.set(false);
    this.state.maximized.set(false);
    this.state.open.set(false);
    this.syncVisibility();
  }

  toggleMaximized(): void {
    this.state.maximized.toggle()();
  }

  toggleAdd(): void {
    this.state.addOpen.toggle()();
    this.syncVisibility();
  }

  closeAdd(): void {
    if (!this.state.addOpen.get()) return;
    this.state.addOpen.set(false);
    this.syncVisibility();
  }

  selectTab(id: string): void {
    this.state.activeId.set(id);
    this.syncVisibility();
  }

  async open(surface: UiSurfaceContribution): Promise<void> {
    if (surface.available?.() === false) return;
    this.state.addOpen.set(false);
    if (!surface.render) {
      this.state.maximized.set(false);
      this.syncVisibility();
    }
    try {
      await this.surfaces.open(surface.id);
    } finally {
      this.syncVisibility();
    }
  }

  openSurface(surface: UiSurfaceContribution): void {
    if (!surface.render) return;
    const existing = surface.multiple
      ? undefined
      : this.state.tabs.get().find((tab) => tab.surface.id === surface.id);
    const id = existing?.id ?? `${surface.id}-${crypto.randomUUID()}`;
    if (!existing) {
      const visibility = new SurfaceVisibility();
      const instance = { id, visibility };
      this.state.tabs.update((tabs) => [
        ...tabs,
        { id, surface, instance, node: surface.render!(instance) },
      ]);
    }
    this.state.activeId.set(id);
    this.state.addOpen.set(false);
    this.state.open.set(true);
    this.syncVisibility();
  }

  closeTab(id: string): void {
    const tabs = this.state.tabs.get();
    const index = tabs.findIndex((tab) => tab.id === id);
    if (index < 0) return;
    const remaining = tabs.filter((tab) => tab.id !== id);
    batch(() => {
      this.state.tabs.set(remaining);
      if (this.state.activeId.get() === id) {
        this.state.activeId.set(remaining[Math.min(index, remaining.length - 1)]?.id ?? null);
      }
      if (remaining.length === 0) this.hide();
    });
    this.syncVisibility();
  }

  updateSurfaces(): void {
    const surfaces = this.surfaces.list();
    const ids = new Set(surfaces.map((surface) => surface.id));
    const previousTabs = this.state.tabs.get();
    const tabs = previousTabs.filter((tab) => ids.has(tab.surface.id));
    const removed = tabs.length !== previousTabs.length;
    const activeId = tabs.some((tab) => tab.id === this.state.activeId.get())
      ? this.state.activeId.get()
      : tabs.at(-1)?.id ?? null;
    batch(() => {
      this.state.surfaces.set(surfaces);
      this.state.tabs.set(tabs);
      this.state.activeId.set(activeId);
    });
    if (removed && !tabs.length) this.hide();
    else this.syncVisibility();
  }

  saveWidth(): void {
    void this.runtime.call("settings.set", { key: "panel.width", value: this.state.width.get() });
  }

  syncVisibility(): void {
    const visible = this.state.open.get() && !this.state.addOpen.get();
    const activeId = this.state.activeId.get();
    for (const tab of this.state.tabs.get()) {
      tab.instance.visibility.set(visible && tab.id === activeId);
    }
  }
}

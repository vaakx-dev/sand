import type { UiSurfaceContribution } from "@sand/extension-api";

export class Surfaces {
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

  refresh(): void {
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async open(id: string): Promise<void> {
    const surface = this.surfaces.get(id);
    if (!surface) throw new Error(`unknown UI surface: ${id}`);
    if (surface.available?.() === false) throw new Error(`${surface.label} is unavailable`);
    if (surface.render) {
      for (const listener of this.openListeners) listener(surface);
    } else {
      await surface.open?.();
    }
  }

  onOpen(listener: (surface: UiSurfaceContribution) => void): () => void {
    this.openListeners.add(listener);
    return () => this.openListeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

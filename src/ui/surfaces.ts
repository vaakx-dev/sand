import type { UiSurfaceContribution } from "@sand/extension-api";

import { Contributions } from "./contributions.ts";
import { Listeners } from "./listeners.ts";

export class Surfaces {
  private readonly surfaces = new Contributions<UiSurfaceContribution>(
    "UI surface",
    (surface) => surface.id,
  );
  private readonly opened = new Listeners<[UiSurfaceContribution]>();

  register(surface: UiSurfaceContribution): () => void {
    if (!surface.render && !surface.open) throw new Error(`UI surface has no action: ${surface.id}`);
    return this.surfaces.register(surface);
  }

  list(): UiSurfaceContribution[] {
    return this.surfaces.list().sort((left, right) =>
      (left.order ?? 0) - (right.order ?? 0) || left.label.localeCompare(right.label)
    );
  }

  refresh(): void {
    this.surfaces.refresh();
  }

  subscribe(listener: () => void): () => void {
    return this.surfaces.subscribe(listener);
  }

  async open(id: string): Promise<void> {
    const surface = this.surfaces.get(id);
    if (!surface) throw new Error(`unknown UI surface: ${id}`);
    if (surface.available?.() === false) throw new Error(`${surface.label} is unavailable`);
    if (surface.render) {
      this.opened.notify(surface);
    } else {
      await surface.open?.();
    }
  }

  onOpen(listener: (surface: UiSurfaceContribution) => void): () => void {
    return this.opened.subscribe(listener);
  }
}

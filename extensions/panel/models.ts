import type {
  UiSurfaceContribution,
  UiSurfaceInstance,
  UiSurfaceVisibility,
} from "@sand/extension-api";

export class SurfaceVisibility implements UiSurfaceVisibility {
  private value = false;
  private readonly listeners = new Set<(visible: boolean) => void>();

  get(): boolean {
    return this.value;
  }

  set(visible: boolean): void {
    if (visible === this.value) return;
    this.value = visible;
    for (const listener of this.listeners) listener(visible);
  }

  subscribe(listener: (visible: boolean) => void): () => void {
    this.listeners.add(listener);
    listener(this.value);
    return () => this.listeners.delete(listener);
  }
}

export interface PanelTab {
  id: string;
  surface: UiSurfaceContribution;
  instance: UiSurfaceInstance & { visibility: SurfaceVisibility };
  node: HTMLElement;
}

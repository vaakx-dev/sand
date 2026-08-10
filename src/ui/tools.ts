import type { UiToolPresentation } from "@sand/extension-api";

export class Tools {
  private readonly presentations = new Map<string, UiToolPresentation>();
  private readonly listeners = new Set<() => void>();

  register(presentation: UiToolPresentation): () => void {
    if (this.presentations.has(presentation.name)) {
      throw new Error(`tool presentation already registered: ${presentation.name}`);
    }
    this.presentations.set(presentation.name, presentation);
    this.notify();
    return () => {
      this.presentations.delete(presentation.name);
      this.notify();
    };
  }

  get(name: string): UiToolPresentation | undefined {
    return this.presentations.get(name);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

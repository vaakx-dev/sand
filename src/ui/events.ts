import type { UiEvent } from "@sand/extension-api";

export class Events {
  private readonly listeners = new Set<(event: UiEvent) => void>();

  emit<T>(kind: string, payload: T): void {
    for (const listener of this.listeners) listener({ kind, payload });
  }

  subscribe(listener: (event: UiEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

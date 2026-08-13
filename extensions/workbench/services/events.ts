import type { UiEvent } from "../api.ts";
import { Listeners } from "./listeners.ts";

export class Events {
  private readonly listeners = new Listeners<[UiEvent]>();

  emit<T>(kind: string, payload: T): void {
    this.listeners.notify({ kind, payload });
  }

  subscribe(listener: (event: UiEvent) => void): () => void {
    return this.listeners.subscribe(listener);
  }
}

import { invoke } from "@tauri-apps/api/core";

import type { JsonValue, RuntimeClient, RuntimeEvent } from "@sand/extension-api";

export class Client implements RuntimeClient {
  private readonly listeners = new Set<(event: RuntimeEvent) => void>();
  private lastEvent = 0;

  constructor(active: boolean) {
    if (active) void this.poll();
  }

  call<T = JsonValue>(method: string, params: JsonValue = null): Promise<T> {
    return invoke<T>("runtime_call", { method, params });
  }

  command<T = JsonValue>(id: string, params: JsonValue = null): Promise<T> {
    return this.call<T>("commands.execute", { id, params });
  }

  subscribe(listener: (event: RuntimeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async poll(): Promise<void> {
    while (true) {
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

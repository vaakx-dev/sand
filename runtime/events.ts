import type { EventApi, HostEvent, JsonValue } from "@sand/extension-api";

type ProtocolWriter = (value: object) => void;

export class Events implements EventApi {
  private readonly listeners = new Set<(event: HostEvent) => void | Promise<void>>();

  constructor(private readonly write: ProtocolWriter) {}

  emit(kind: string, payload: JsonValue): void {
    const event = { kind, payload };
    for (const listener of this.listeners) {
      void Promise.resolve(listener(event)).catch((error) => console.error(error));
    }
    this.write({ event: { kind, payload } });
  }

  record(kind: string, payload: JsonValue): void {
    this.write({ record: { kind, payload } });
  }

  subscribe(listener: (event: HostEvent) => void | Promise<void>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

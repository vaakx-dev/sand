import type { EventApi, HostEvent, JsonValue } from "@sand/extension-api";

export type ProtocolWriter = (value: object) => void;

export class Events implements EventApi {
  private readonly listeners = new Set<(event: HostEvent) => void | Promise<void>>();

  constructor(
    private readonly write: ProtocolWriter,
    private readonly workspaceId?: string,
  ) {}

  emit(kind: string, payload: JsonValue): void {
    const event = { kind, payload };
    for (const listener of this.listeners) {
      void Promise.resolve(listener(event)).catch((error) => console.error(error));
    }
    this.write({ event: { workspaceId: this.workspaceId, kind, payload } });
  }

  record(kind: string, payload: JsonValue): void {
    if (!this.workspaceId) throw new Error("workspace events are required to record state");
    this.write({ record: { workspaceId: this.workspaceId, kind, payload } });
  }

  subscribe(listener: (event: HostEvent) => void | Promise<void>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

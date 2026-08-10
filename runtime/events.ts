import type { EventApi, JsonValue } from "@sand/extension-api";

type ProtocolWriter = (value: object) => void;

export class Events implements EventApi {
  constructor(private readonly write: ProtocolWriter) {}

  emit(kind: string, payload: JsonValue): void {
    this.write({ event: { kind, payload } });
  }
}

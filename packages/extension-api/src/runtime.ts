import type { JsonValue } from "./json.ts";

export interface RuntimeEvent<T = JsonValue> {
  seq: number;
  kind: string;
  payload: T;
}

export interface RuntimeClient {
  call<T = JsonValue>(method: string, params?: JsonValue): Promise<T>;
  command<T = JsonValue>(id: string, params?: JsonValue): Promise<T>;
  subscribe(listener: (event: RuntimeEvent) => void): () => void;
}

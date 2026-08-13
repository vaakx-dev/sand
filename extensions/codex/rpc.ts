import { createInterface, type Interface } from "node:readline";

export type RpcId = number | string;

export interface RpcPeer {
  request<T = unknown>(method: string, params?: unknown): Promise<T>;
  notify(method: string, params?: unknown): void;
}

export interface RpcHandler {
  request(method: string, params: unknown): Promise<unknown>;
  notification(method: string, params: unknown): void | Promise<void>;
  closed(error: Error): void;
}

interface Pending {
  resolve(value: unknown): void;
  reject(error: Error): void;
}

interface RpcMessage {
  id?: RpcId;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code?: number; message?: string };
}

export class RpcConnection implements RpcPeer {
  private readonly pending = new Map<string, Pending>();
  private lines?: Interface;
  private stopped = false;

  constructor(
    private readonly input: NodeJS.ReadableStream,
    private readonly writeLine: (line: string) => void,
    private readonly includeHeader: boolean,
    private readonly nextId: () => RpcId,
  ) {}

  start(handler: RpcHandler): void {
    if (this.lines) throw new Error("RPC connection is already started");
    this.lines = createInterface({ input: this.input });
    this.lines.on("line", (line) => void this.receive(line, handler));
    this.lines.on("close", () => {
      const error = new Error("RPC connection closed");
      this.stop(error);
      handler.closed(error);
    });
  }

  request<T = unknown>(method: string, params?: unknown): Promise<T> {
    const id = this.nextId();
    return new Promise<T>((resolve, reject) => {
      this.pending.set(key(id), {
        resolve: (value) => resolve(value as T),
        reject,
      });
      try {
        this.send({ id, method, ...(params === undefined ? {} : { params }) });
      } catch (error) {
        this.pending.delete(key(id));
        reject(asError(error));
      }
    });
  }

  notify(method: string, params?: unknown): void {
    this.send({ method, ...(params === undefined ? {} : { params }) });
  }

  stop(error = new Error("RPC connection stopped")): void {
    if (this.stopped) return;
    this.stopped = true;
    this.lines?.close();
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }

  private async receive(line: string, handler: RpcHandler): Promise<void> {
    let message: RpcMessage;
    try {
      message = JSON.parse(line) as RpcMessage;
    } catch (error) {
      console.error(`invalid RPC message: ${asError(error).message}`);
      return;
    }

    if (typeof message.method === "string") {
      if (message.id === undefined) {
        await handler.notification(message.method, message.params ?? null);
        return;
      }
      try {
        const result = await handler.request(message.method, message.params ?? null);
        this.send({ id: message.id, result: result ?? null });
      } catch (error) {
        this.send({
          id: message.id,
          error: { code: -32603, message: asError(error).message },
        });
      }
      return;
    }

    if (message.id === undefined) return;
    const pending = this.pending.get(key(message.id));
    if (!pending) return;
    this.pending.delete(key(message.id));
    if (message.error) {
      pending.reject(new Error(message.error.message || "RPC request failed"));
    } else {
      pending.resolve(message.result ?? null);
    }
  }

  private send(message: RpcMessage): void {
    if (this.stopped) throw new Error("RPC connection is closed");
    const body = this.includeHeader ? { jsonrpc: "2.0", ...message } : message;
    this.writeLine(`${JSON.stringify(body)}\n`);
  }
}

function key(id: RpcId): string {
  return `${typeof id}:${id}`;
}

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

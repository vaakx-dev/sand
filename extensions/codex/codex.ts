import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

import { RpcConnection } from "./rpc.ts";

export interface CodexProcess {
  rpc: RpcConnection;
  exited: Promise<number>;
  close(): void;
}

export function startCodex(command: string): CodexProcess {
  const child = Bun.spawn([command, "app-server", "--stdio"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "inherit",
  });
  let requestId = 0;
  const rpc = new RpcConnection(
    Readable.fromWeb(child.stdout as unknown as NodeReadableStream),
    (line) => {
      child.stdin.write(line);
      child.stdin.flush();
    },
    false,
    () => ++requestId,
  );
  return {
    rpc,
    exited: child.exited,
    close: () => child.kill(),
  };
}

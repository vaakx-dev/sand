import { expect, test } from "bun:test";

import type { JsonValue, RuntimeCalls } from "@sand/extension-api";

import { CodexConnection } from "./connection.ts";

class Runtime implements RuntimeCalls {
  connected = false;
  available = true;

  async call<T = JsonValue>(method: string): Promise<T> {
    if (method === "agent.providers") {
      return (this.connected ? [{ id: "codex" }] : []) as T;
    }
    if (method === "acp.connect") {
      this.connected = true;
      return {} as T;
    }
    if (method === "acp.disconnect") {
      this.connected = false;
      return true as T;
    }
    throw new Error(`unexpected call: ${method}`);
  }

  async command<T = JsonValue>(id: string): Promise<T> {
    if (id !== "codex.launch") throw new Error(`unexpected command: ${id}`);
    if (!this.available) throw new Error("Codex CLI was not found in PATH");
    return { command: "bun", args: ["run", "main.ts", "codex"] } as T;
  }
}

test("connects an installed Codex provider from its disconnected state", async () => {
  const runtime = new Runtime();
  const connection = new CodexConnection(runtime);

  expect(await connection.status()).toMatchObject({ available: false, label: "Disconnected" });
  expect(await connection.tryConnect()).toBe(true);
  expect(await connection.status()).toMatchObject({ available: true, label: "Connected" });
  await connection.disconnect();
  expect(await connection.status()).toMatchObject({ available: false, label: "Disconnected" });
});

test("startup connection failure is non-fatal", async () => {
  const runtime = new Runtime();
  runtime.available = false;

  expect(await new CodexConnection(runtime).tryConnect()).toBe(false);
  expect(runtime.connected).toBe(false);
});

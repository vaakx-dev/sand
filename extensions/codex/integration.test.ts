import { afterEach, expect, test } from "bun:test";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { once } from "node:events";

const children: ChildProcessWithoutNullStreams[] = [];
const homes: string[] = [];

afterEach(async () => {
  for (const child of children.splice(0)) {
    if (child.exitCode === null) {
      child.stdin.end();
      await Promise.race([once(child, "exit"), delay(2_000).then(() => child.kill())]);
    }
  }
  await delay(50);
  await Promise.all(homes.splice(0).map(removeHome));
});

test.skipIf(!Bun.which("codex"))("bridges the installed Codex CLI over ACP", async () => {
  const codex = Bun.which("codex")!;
  const home = await mkdtemp(join(tmpdir(), "sand-codex-"));
  homes.push(home);
  const child = spawn(process.execPath, [
    "run",
    "--no-install",
    join(import.meta.dir, "main.ts"),
    codex,
  ], {
    env: { ...process.env, CODEX_HOME: home },
    stdio: ["pipe", "pipe", "pipe"],
  });
  children.push(child);
  const errors: string[] = [];
  child.stderr.on("data", (chunk) => errors.push(String(chunk)));
  const lines = createInterface({ input: child.stdout });
  const pending = new Map<number, (message: Record<string, unknown>) => void>();
  lines.on("line", (line) => {
    const message = JSON.parse(line) as Record<string, unknown>;
    const id = typeof message.id === "number" ? message.id : undefined;
    if (id !== undefined) pending.get(id)?.(message);
  });
  const request = (id: number, method: string, params: unknown) => {
    const response = new Promise<Record<string, unknown>>((resolve) => pending.set(id, resolve));
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    return response;
  };

  const initialized = await within(
    request(1, "initialize", { protocolVersion: 1, clientCapabilities: {} }),
    errors,
  );
  expect(initialized.error).toBeUndefined();
  expect(initialized.result).toMatchObject({
    protocolVersion: 1,
    agentInfo: { name: "codex", title: "Codex CLI" },
    _meta: {
      "sand.app/provider": {
        defaultModel: expect.any(String),
        models: expect.any(Array),
      },
    },
  });

  const session = await within(
    request(2, "session/new", { cwd: process.cwd(), mcpServers: [] }),
    errors,
  );
  expect(session.error).toBeUndefined();
  expect(session.result).toMatchObject({
    sessionId: expect.any(String),
    configOptions: expect.any(Array),
  });
  child.stdin.end();
  await once(child, "exit");
}, 20_000);

async function within(
  response: Promise<Record<string, unknown>>,
  errors: string[],
): Promise<Record<string, unknown>> {
  return await Promise.race([
    response,
    new Promise<never>((_, reject) => setTimeout(
      () => reject(new Error(`Codex bridge timed out\n${errors.join("")}`)),
      10_000,
    )),
  ]);
}

async function removeHome(path: string): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await rm(path, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === 4) throw error;
      await delay(100);
    }
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

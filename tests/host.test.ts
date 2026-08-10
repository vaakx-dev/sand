import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterAll, beforeAll, describe, expect, test } from "bun:test";

interface WireMessage {
  id?: number;
  result?: unknown;
  error?: string;
  event?: { kind: string; payload: unknown };
}

const root = resolve(import.meta.dir, "..");
let workspace = "";
let messages: WireMessage[] = [];

beforeAll(async () => {
  workspace = await mkdtemp(join(tmpdir(), "sand-host-"));
  const child = Bun.spawn([process.execPath, "run", join(root, "runtime", "host.ts")], {
    cwd: root,
    env: {
      ...process.env,
      SAND_APP_ROOT: root,
      SAND_BUILTIN_EXTENSIONS: join(root, "extensions"),
      SAND_USER_EXTENSIONS: join(workspace, "user-extensions"),
      SAND_WORKSPACE: workspace,
      SAND_CACHE: join(workspace, "cache"),
      SAND_CONFIG: join(workspace, "config"),
    },
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });

  const requests = [
    { id: 1, method: "runtime.info", params: null },
    { id: 2, method: "extensions.list", params: null },
    { id: 3, method: "extensions.ui", params: null },
    {
      id: 4,
      method: "commands.execute",
      params: { id: "workspace.write", params: { path: "hello.txt", content: "hello" } },
    },
    {
      id: 5,
      method: "commands.execute",
      params: { id: "workspace.read", params: { path: "hello.txt" } },
    },
    { id: 6, method: "agent.providers", params: null },
    {
      id: 18,
      method: "settings.set",
      params: {
        key: "agent.titleGeneration",
        value: { provider: "echo", model: "local", reasoning: "medium" },
      },
    },
    {
      id: 7,
      method: "agent.start",
      params: { prompt: "protocol smoke", provider: "echo", model: "local" },
    },
    { id: 8, method: "agent.tools", params: null },
    {
      id: 9,
      method: "agent.tool",
      params: { name: "write", input: { path: "tools.txt", content: "alpha\nbeta\n" } },
    },
    {
      id: 10,
      method: "agent.tool",
      params: { name: "edit", input: { path: "tools.txt", edits: [{ oldText: "beta", newText: "gamma" }] } },
    },
    {
      id: 11,
      method: "agent.tool",
      params: { name: "read", input: { path: "tools.txt" } },
    },
    {
      id: 12,
      method: "agent.tool",
      params: { name: "bash", input: { command: "echo sand-tool-smoke", timeout: 5 } },
    },
    {
      id: 13,
      method: "commands.execute",
      params: { id: "chatgpt.auth.status", params: null },
    },
    {
      id: 14,
      method: "agent.tool",
      params: {
        name: "update_plan",
        input: { explanation: "test", plan: [{ step: "Verify plan extension", status: "completed" }] },
      },
    },
    { id: 15, method: "extensions.reload", params: null },
    { id: 16, method: "extensions.ui", params: null },
    {
      id: 17,
      method: "commands.execute",
      params: { id: "projects.list", params: null },
    },
  ];
  child.stdin.write(`${requests.map((request) => JSON.stringify(request)).join("\n")}\n`);
  child.stdin.end();

  const stdout = await new Response(child.stdout as ReadableStream).text();
  const stderr = await new Response(child.stderr as ReadableStream).text();
  const exitCode = await child.exited;
  if (exitCode !== 0) throw new Error(stderr || `host exited with ${exitCode}`);
  messages = stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as WireMessage);
});

afterAll(async () => {
  await rm(workspace, { recursive: true, force: true });
});

describe("extension host protocol", () => {
  test("discovers host and UI extensions", () => {
    const extensions = response<unknown[]>(2);
    const bundles = response<{ manifest: { id: string }; source?: string; styles: string[] }[]>(3);
    expect(extensions.length).toBeGreaterThanOrEqual(8);
    expect(bundles.map((bundle) => bundle.manifest.id)).toEqual(expect.arrayContaining([
      "sand.workbench",
      "sand.files",
      "sand.right-sidebar",
      "sand.terminal",
      "sand.tool.plan",
      "sand.theme.defaults",
    ]));
    expect(bundles.find((bundle) => bundle.source)?.source?.length).toBeGreaterThan(10_000);
    expect(bundles.flatMap((bundle) => bundle.styles).join("\n").length).toBeGreaterThan(10_000);
  });

  test("registers tools as independent extensions", () => {
    const extensions = response<{ id: string; contributions: string[] }[]>(2);
    for (const name of ["read", "write", "edit", "bash"]) {
      const extension = extensions.find((item) => item.id === `sand.tool.${name}`);
      expect(extension?.contributions).toContain(`tool:${name}`);
    }
  });

  test("executes read, write, edit, and bash tools", () => {
    expect(response<{ name: string }[]>(8).map((tool) => tool.name).sort()).toEqual([
      "bash",
      "edit",
      "read",
      "update_plan",
      "write",
    ]);
    expect(response<string>(9)).toContain("Successfully wrote");
    expect(response<string>(10)).toContain("Successfully replaced");
    expect(response<string>(11)).toContain("alpha\ngamma");
    expect(response<string>(12)).toContain("sand-tool-smoke");
  });

  test("uses ChatGPT subscription auth without an API key", () => {
    expect(response<{ authenticated: boolean }>(13).authenticated).toBe(false);
  });

  test("executes workspace extension commands", async () => {
    expect(response<string>(5)).toBe("hello");
    expect(await readFile(join(workspace, "hello.txt"), "utf8")).toBe("hello");
  });

  test("remembers the active workspace as a project", () => {
    const projects = response<{ name: string; path: string }[]>(17);
    expect(projects.some((project) => project.path === workspace)).toBe(true);
  });

  test("runs an agent turn through a provider extension", () => {
    const providers = response<{ id: string }[]>(6);
    expect(providers.some((provider) => provider.id === "echo")).toBe(true);
    expect(messages.some((message) => message.event?.kind === "agent.delta")).toBe(true);
    expect(response<{ status: string }>(7).status).toBe("running");
  });

  test("generates a thread title with its independent provider settings", () => {
    const update = messages.find((message) =>
      message.event?.kind === "agent.session"
      && (message.event.payload as { session?: { title?: string } }).session?.title
        ?.includes("Extension host is ready")
    );
    expect(update).toBeDefined();
  });

  test("publishes plans from an independent extension", () => {
    expect(response<{ plan: unknown[] }>(14).plan).toHaveLength(1);
    expect(messages.some((message) => message.event?.kind === "agent.plan")).toBe(true);
  });

  test("reloads host and UI extensions coherently", () => {
    expect(response<unknown[]>(15).length).toBeGreaterThanOrEqual(9);
    const bundles = response<{ source?: string; styles: string[] }[]>(16);
    expect(bundles.find((bundle) => bundle.source)?.source?.length).toBeGreaterThan(10_000);
    expect(bundles.flatMap((bundle) => bundle.styles).join("\n").length).toBeGreaterThan(10_000);
  });
});

function response<T = unknown>(id: number): T {
  const message = messages.find((candidate) => candidate.id === id);
  if (!message) throw new Error(`missing response ${id}`);
  if (message.error) throw new Error(message.error);
  return message.result as T;
}

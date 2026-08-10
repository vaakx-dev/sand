import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, expect, test } from "bun:test";

import type { EventApi, JsonValue } from "@sand/extension-api";
import { TerminalProcesses } from "../extensions/terminal/processes.ts";

interface TerminalEvent {
  kind: string;
  payload: Record<string, JsonValue>;
}

let workspace = "";
let terminals: TerminalProcesses | null = null;
let events: TerminalEvent[] = [];

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), "sand-terminal-"));
  await mkdir(join(workspace, "nested"));
  events = [];
  const eventApi: EventApi = {
    emit(kind, payload) {
      events.push({ kind, payload: payload as Record<string, JsonValue> });
    },
  };
  terminals = new TerminalProcesses(workspace, eventApi);
});

afterEach(async () => {
  await terminals?.closeAll();
  await rm(workspace, { recursive: true, force: true });
});

test("keeps shell state and emits prompts for a persistent terminal", async () => {
  const opened = terminals!.open() as { id: string; cwd: string };
  expect(opened.cwd).toBe(workspace);
  expect(terminals!.write(opened.id, "echo sand-terminal-smoke")).toBe(true);
  await waitFor(() => output(opened.id).includes("sand-terminal-smoke"));

  expect(terminals!.write(opened.id, "cd nested")).toBe(true);
  await waitFor(() => prompts(opened.id).at(-1)?.includes("nested") ?? false);

  expect(terminals!.write(opened.id, "echo current-directory")).toBe(true);
  await waitFor(() => commands(opened.id).at(-1)?.includes("current-directory") ?? false);

  expect(prompts(opened.id)[0]).toContain(workspace);
  expect(prompts(opened.id).at(-1)).toContain("nested");
  expect(commands(opened.id).at(-1)).toContain("nested");
});

function output(id: string): string {
  return events
    .filter((event) => event.kind === "terminal.output" && event.payload.id === id)
    .map((event) => String(event.payload.text ?? ""))
    .join("");
}

function prompts(id: string): string[] {
  return events
    .filter((event) =>
      event.kind === "terminal.output"
      && event.payload.id === id
      && event.payload.stream === "prompt"
    )
    .map((event) => String(event.payload.text ?? ""));
}

function commands(id: string): string[] {
  return events
    .filter((event) =>
      event.kind === "terminal.output"
      && event.payload.id === id
      && event.payload.stream === "command"
    )
    .map((event) => String(event.payload.text ?? ""));
}

async function waitFor(condition: () => boolean): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (!condition()) {
    if (Date.now() >= deadline) throw new Error("timed out waiting for terminal output");
    await Bun.sleep(20);
  }
}

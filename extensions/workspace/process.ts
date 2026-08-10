import type { JsonValue } from "@sand/extension-api";
import {
  resolveWorkspacePath,
  shellArguments,
} from "../../packages/extension-runtime/src/index.ts";


export interface ShellResult {
  command: string;
  cwd: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function spawnText(
  command: string[],
  cwd: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const child = Bun.spawn(command, { cwd, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout as ReadableStream).text(),
    new Response(child.stderr as ReadableStream).text(),
    child.exited,
  ]);
  return { exitCode, stdout, stderr };
}

export function launch(command: string[], cwd: string): JsonValue {
  const child = Bun.spawn(command, { cwd, stdin: "ignore", stdout: "ignore", stderr: "ignore" });
  child.unref();
  return { launched: command[0] ?? "", path: cwd };
}

export async function runShell(
  workspace: string,
  command: string,
  cwd: string | undefined,
  timeoutMs: number | undefined,
  signal?: AbortSignal,
): Promise<ShellResult> {
  const directory = resolveWorkspacePath(workspace, cwd || ".");
  const process = Bun.spawn(shellArguments(command), {
    cwd: directory,
    env: { ...globalThis.process.env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const abort = () => process.kill();
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = timeoutMs ? setTimeout(abort, timeoutMs) : undefined;
  try {
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(process.stdout as ReadableStream).text(),
      new Response(process.stderr as ReadableStream).text(),
      process.exited,
    ]);
    return { command, cwd: directory, exitCode, stdout, stderr };
  } finally {
    if (timeout) clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

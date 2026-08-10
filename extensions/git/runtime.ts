import { shellArguments } from "@sand/extension-runtime";

export interface Result {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function run(
  workspace: string,
  command: string,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<Result> {
  const process = Bun.spawn(shellArguments(command), {
    cwd: workspace,
    env: { ...globalThis.process.env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const abort = () => process.kill();
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, timeoutMs);
  try {
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(process.stdout as ReadableStream).text(),
      new Response(process.stderr as ReadableStream).text(),
      process.exited,
    ]);
    return { exitCode, stdout, stderr };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

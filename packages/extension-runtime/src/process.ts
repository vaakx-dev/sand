export interface ProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  aborted: boolean;
  timedOut: boolean;
}

export interface ProcessOptions {
  cwd: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function spawnText(
  command: string[],
  options: ProcessOptions,
): Promise<ProcessResult> {
  const child = Bun.spawn(command, {
    cwd: options.cwd,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  let timedOut = false;
  const abort = () => child.kill();
  const timeout = options.timeoutMs === undefined
    ? undefined
    : setTimeout(() => {
        timedOut = true;
        abort();
      }, options.timeoutMs);
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) abort();
  try {
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout as ReadableStream).text(),
      new Response(child.stderr as ReadableStream).text(),
      child.exited,
    ]);
    return {
      exitCode,
      stdout,
      stderr,
      aborted: options.signal?.aborted ?? false,
      timedOut,
    };
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abort);
  }
}

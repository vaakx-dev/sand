export interface ProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function spawnText(command: string[], cwd: string): Promise<ProcessResult> {
  const child = Bun.spawn(command, {
    cwd,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout as ReadableStream).text(),
    new Response(child.stderr as ReadableStream).text(),
    child.exited,
  ]);
  return { exitCode, stdout, stderr };
}

import { shellArguments, spawnText } from "@sand/extension-runtime";

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
  return spawnText(shellArguments(command), { cwd: workspace, signal, timeoutMs });
}

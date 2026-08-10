import type { HostExtensionContext } from "@sand/extension-api";

import { runShell } from "./process.ts";

export function registerGit(context: HostExtensionContext): void {
  context.commands.register("git.status", async () => {
    const result = await runShell(
      context.workspace,
      "git -c color.ui=false status --short --branch",
      undefined,
      10_000,
    );
    const changeRequestState = result.exitCode === 0
      ? await readChangeRequestState(context.workspace)
      : null;
    return {
      repository: result.exitCode === 0,
      output: result.stdout.trim(),
      error: result.stderr.trim(),
      changeRequestState,
    };
  });
  context.commands.register("git.diff", async () => {
    const result = await runShell(
      context.workspace,
      "git -c color.ui=false diff --no-ext-diff --unified=3",
      undefined,
      20_000,
    );
    return {
      repository: result.exitCode === 0,
      diff: result.stdout,
      error: result.stderr.trim(),
    };
  });
  context.commands.register("git.init", async () => {
    const result = await runShell(context.workspace, "git init", undefined, 20_000);
    if (result.exitCode !== 0) throw new Error(result.stderr.trim() || "git init failed");
    return { initialized: true, output: result.stdout.trim() };
  });
}

async function readChangeRequestState(
  workspace: string,
): Promise<"open" | "closed" | "merged" | null> {
  const result = await runShell(
    workspace,
    "gh pr view --json state --jq .state",
    undefined,
    5_000,
  );
  if (result.exitCode !== 0) return null;
  const state = result.stdout.trim().toLowerCase();
  return state === "open" || state === "closed" || state === "merged" ? state : null;
}

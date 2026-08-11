import type { HostExtension, ThreadChangeRequestState } from "@sand/extension-api";

import { commands } from "./api.ts";
import { run } from "./runtime.ts";

const extension: HostExtension = {
  activate(context) {
    context.commands.register(commands.status, async (_params, signal) => {
      const result = await run(
        context.workspace.path,
        "git -c color.ui=false status --short --branch",
        10_000,
        signal,
      );
      return {
        repository: result.exitCode === 0,
        output: result.stdout.trim(),
        error: result.stderr.trim(),
        changeRequestState: result.exitCode === 0
          ? await changeRequestState(context.workspace.path, signal)
          : null,
      };
    });
    context.commands.register(commands.diff, async (_params, signal) => {
      const result = await run(
        context.workspace.path,
        "git -c color.ui=false diff --no-ext-diff --unified=3",
        20_000,
        signal,
      );
      return {
        repository: result.exitCode === 0,
        diff: result.stdout,
        error: result.stderr.trim(),
      };
    });
    context.commands.register(commands.initialize, async (_params, signal) => {
      const result = await run(context.workspace.path, "git init", 20_000, signal);
      if (result.exitCode !== 0) throw new Error(result.stderr.trim() || "git init failed");
      context.events.emit("workspace.changed", { path: "." });
      return { initialized: true, output: result.stdout.trim() };
    });
  },
};

async function changeRequestState(
  workspace: string,
  signal?: AbortSignal,
): Promise<ThreadChangeRequestState | null> {
  const result = await run(workspace, "gh pr view --json state --jq .state", 5_000, signal);
  if (result.exitCode !== 0) return null;
  const state = result.stdout.trim().toLowerCase();
  return state === "open" || state === "closed" || state === "merged" ? state : null;
}

export default extension;

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { objectSchema, requiredString, type HostExtension } from "@sand/extension-api";
import { shellArguments, spawnText } from "@sand/extension-runtime";

const MAX_LINES = 2_000;
const MAX_BYTES = 50 * 1024;

const extension: HostExtension = {
  activate(context) {
    context.tools.register({
      definition: {
        name: "bash",
        description: `Execute a shell command in the workspace with full user authority. Returns stdout and stderr, truncated to the last ${MAX_LINES} lines or ${MAX_BYTES / 1024}KB. Optional timeout is in seconds.`,
        parameters: objectSchema(
          {
            command: { type: "string", description: "Shell command to execute" },
            timeout: { type: "number", description: "Optional timeout in seconds" },
          },
          ["command"],
        ),
      },
      async execute(input, signal) {
        const command = requiredString(input, "command");
        const timeout = optionalTimeout(input.timeout);
        const result = await spawnText(shellArguments(command), {
          cwd: context.workspace.path,
          signal,
          timeoutMs: timeout === undefined ? undefined : timeout * 1_000,
        });
        const full = [result.stdout, result.stderr]
          .filter(Boolean)
          .join(result.stdout && result.stderr ? "\n" : "");
        const truncated = await truncate(context.workspace.home, full);
        const suffix = truncated.path ? `\n\n[Full output: ${truncated.path}]` : "";
        const output = `${truncated.output || "(no output)"}${suffix}`;
        if (result.aborted) throw new Error(`${output}\n\nCommand aborted`);
        if (result.timedOut) throw new Error(`${output}\n\nCommand timed out`);
        if (result.exitCode !== 0) {
          throw new Error(`${output}\n\nCommand exited with code ${result.exitCode}`);
        }
        return output;
      },
    });
  },
};

async function truncate(workspaceHome: string, value: string): Promise<{ output: string; path?: string }> {
  const lines = value.split("\n");
  let selected = lines.slice(-MAX_LINES).join("\n");
  while (Buffer.byteLength(selected) > MAX_BYTES && selected.includes("\n")) {
    selected = selected.slice(selected.indexOf("\n") + 1);
  }
  if (selected === value) return { output: value };
  const directory = join(workspaceHome, "tool-output");
  await mkdir(directory, { recursive: true });
  const path = join(directory, `${crypto.randomUUID()}.log`);
  await writeFile(path, value, "utf8");
  return { output: selected, path };
}

function optionalTimeout(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error("timeout must be a positive number of seconds");
  }
  return value;
}

export default extension;

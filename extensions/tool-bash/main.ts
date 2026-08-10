import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { objectSchema, requiredString, type HostExtension } from "@sand/extension-api";
import { shellArguments } from "@sand/extension-runtime";

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
        const process = Bun.spawn(shellArguments(command), {
          cwd: context.workspace,
          env: { ...globalThis.process.env },
          stdout: "pipe",
          stderr: "pipe",
        });
        const abort = () => process.kill();
        signal.addEventListener("abort", abort, { once: true });
        const timer = timeout ? setTimeout(abort, timeout * 1_000) : undefined;
        try {
          const [stdout, stderr, exitCode] = await Promise.all([
            new Response(process.stdout as ReadableStream).text(),
            new Response(process.stderr as ReadableStream).text(),
            process.exited,
          ]);
          const full = [stdout, stderr].filter(Boolean).join(stdout && stderr ? "\n" : "");
          const truncated = await truncate(context.workspace, full);
          const suffix = truncated.path ? `\n\n[Full output: ${truncated.path}]` : "";
          const output = `${truncated.output || "(no output)"}${suffix}`;
          if (signal.aborted) throw new Error(`${output}\n\nCommand aborted`);
          if (timer && exitCode !== 0 && timeout) throw new Error(`${output}\n\nCommand timed out or exited with code ${exitCode}`);
          if (exitCode !== 0) throw new Error(`${output}\n\nCommand exited with code ${exitCode}`);
          return output;
        } finally {
          if (timer) clearTimeout(timer);
          signal.removeEventListener("abort", abort);
        }
      },
    });
  },
};

async function truncate(workspace: string, value: string): Promise<{ output: string; path?: string }> {
  const lines = value.split("\n");
  let selected = lines.slice(-MAX_LINES).join("\n");
  while (Buffer.byteLength(selected) > MAX_BYTES && selected.includes("\n")) {
    selected = selected.slice(selected.indexOf("\n") + 1);
  }
  if (selected === value) return { output: value };
  const directory = join(workspace, ".sand", "tool-output");
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

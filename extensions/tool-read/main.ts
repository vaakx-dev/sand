import { readFile } from "node:fs/promises";

import {
  objectSchema,
  positiveInteger,
  requiredString,
  type HostExtension,
} from "@sand/extension-api";
import { resolveWorkspacePath } from "@sand/extension-runtime";

const MAX_LINES = 2_000;
const MAX_BYTES = 50 * 1024;

const extension: HostExtension = {
  activate(context) {
    context.tools.register({
      definition: {
        name: "read",
        description: `Read a text file. Output is limited to ${MAX_LINES} lines or ${MAX_BYTES / 1024}KB. Use offset and limit to continue through large files. Paths may be relative to the workspace or absolute.`,
        parameters: objectSchema(
          {
            path: { type: "string", description: "Path to the file to read" },
            offset: { type: "number", description: "One-based line offset" },
            limit: { type: "number", description: "Maximum lines to return" },
          },
          ["path"],
        ),
      },
      async execute(input) {
        const path = requiredString(input, "path");
        const absolute = resolveWorkspacePath(context.workspace.path, path);
        const content = await readFile(absolute, "utf8");
        const lines = content.split("\n");
        const offset = positiveInteger(input.offset, 1);
        const start = offset - 1;
        if (start >= lines.length) {
          throw new Error(`Offset ${offset} is beyond end of file (${lines.length} lines total)`);
        }
        const requested = positiveInteger(input.limit, lines.length - start);
        const selected = lines.slice(start, start + requested);
        const limited: string[] = [];
        let bytes = 0;
        for (const line of selected) {
          const size = Buffer.byteLength(line) + 1;
          if (limited.length >= MAX_LINES || bytes + size > MAX_BYTES) break;
          limited.push(line);
          bytes += size;
        }
        let output = limited.join("\n");
        const next = start + limited.length + 1;
        if (start + limited.length < lines.length) {
          output += `\n\n[Showing lines ${offset}-${next - 1} of ${lines.length}. Use offset=${next} to continue.]`;
        }
        return output;
      },
    });
  },
};

export default extension;

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { objectSchema, requiredString, type HostExtension } from "@sand/extension-api";
import { resolveWorkspacePath } from "@sand/extension-runtime";

const extension: HostExtension = {
  activate(context) {
    context.tools.register({
      definition: {
        name: "write",
        description: "Write content to a file. Creates parent directories and overwrites an existing file. Paths may be relative to the workspace or absolute.",
        parameters: objectSchema(
          {
            path: { type: "string", description: "Path to the file to write" },
            content: { type: "string", description: "Complete file content" },
          },
          ["path", "content"],
        ),
      },
      async execute(input) {
        const path = requiredString(input, "path");
        const content = requiredString(input, "content", true);
        const absolute = resolveWorkspacePath(context.workspace.path, path);
        await mkdir(dirname(absolute), { recursive: true });
        await writeFile(absolute, content, "utf8");
        context.events.emit("workspace.changed", { path });
        return `Successfully wrote ${Buffer.byteLength(content)} bytes to ${path}`;
      },
    });
  },
};

export default extension;

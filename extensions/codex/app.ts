import { join } from "node:path";

import type { AppExtension } from "@sand/extension-api";

import { commands, type Launch } from "./api.ts";

const extension: AppExtension = {
  activate(context) {
    context.commands.register(commands.launch, () => {
      const codex = Bun.which("codex");
      if (!codex) throw new Error("Codex CLI was not found in PATH");
      return {
        command: process.execPath,
        args: ["run", "--no-install", join(context.root, "main.ts"), codex],
      } satisfies Launch;
    });
  },
};

export default extension;

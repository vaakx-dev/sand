import type { HostExtension, JsonValue } from "@sand/extension-api";

import { commands } from "./api.ts";

const extension: HostExtension = {
  activate(context) {
    context.commands.register(commands.vscode, () => launch(["code", context.workspace]));
    context.commands.register(commands.explorer, () => launch(explorerCommand(context.workspace)));
  },
};

function explorerCommand(workspace: string): string[] {
  if (process.platform === "win32") return ["explorer.exe", workspace];
  if (process.platform === "darwin") return ["open", workspace];
  return ["xdg-open", workspace];
}

function launch(command: string[]): JsonValue {
  const child = Bun.spawn(command, { stdin: "ignore", stdout: "ignore", stderr: "ignore" });
  child.unref();
  return { launched: command[0] ?? "" };
}

export default extension;

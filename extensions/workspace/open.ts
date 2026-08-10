import type { HostExtensionContext } from "@sand/extension-api";

import { launch } from "./process.ts";

export function registerOpenCommands(context: HostExtensionContext): void {
  context.commands.register("workspace.open.vscode", () =>
    launch(["code", context.workspace], context.workspace)
  );
  context.commands.register("workspace.open.explorer", () => {
    if (process.platform === "win32") {
      return launch(["explorer.exe", context.workspace], context.workspace);
    }
    if (process.platform === "darwin") return launch(["open", context.workspace], context.workspace);
    return launch(["xdg-open", context.workspace], context.workspace);
  });
}

import {
  objectValue,
  optionalString,
  requiredString,
  type HostExtension,
  type JsonValue,
} from "@sand/extension-api";

import { commands } from "./api.ts";
import { TerminalProcesses } from "./processes.ts";

const extension: HostExtension = {
  activate(context) {
    const processes = new TerminalProcesses(context.workspace.path, context.events);
    context.commands.register(commands.list, () => processes.list() as unknown as JsonValue);
    context.commands.register(commands.open, (params) =>
      processes.open(optionalString(objectValue(params).cwd))
    );
    context.commands.register(commands.write, (params) => {
      const value = objectValue(params);
      return processes.write(requiredString(value, "id"), requiredString(value, "data"));
    });
    context.commands.register(commands.close, (params) =>
      processes.close(requiredString(objectValue(params), "id"))
    );
    return () => processes.closeAll();
  },
};

export default extension;

import {
  objectValue,
  optionalString,
  requiredString,
  type HostExtension,
} from "@sand/extension-api";

import { commands } from "./api.ts";
import { TerminalProcesses } from "./processes.ts";

let active: TerminalProcesses | null = null;

const extension: HostExtension = {
  activate(context) {
    const processes = new TerminalProcesses(context.workspace, context.events);
    active = processes;
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
  },
  async deactivate() {
    await active?.closeAll();
    active = null;
  },
};

export default extension;

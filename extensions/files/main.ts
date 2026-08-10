import {
  objectValue,
  optionalNumber,
  optionalString,
  requiredString,
  type HostExtension,
  type JsonValue,
} from "@sand/extension-api";

import { commands } from "./api.ts";
import { readText, tree, writeText } from "./runtime/files.ts";
import { search } from "./runtime/search.ts";

const extension: HostExtension = {
  activate(context) {
    context.commands.register(commands.tree, (params) => {
      const value = objectValue(params);
      return tree(
        context.workspace,
        optionalString(value.path) || ".",
        optionalNumber(value.depth) || 5,
      ) as unknown as Promise<JsonValue>;
    });
    context.commands.register(commands.read, (params) =>
      readText(context.workspace, requiredString(objectValue(params), "path"))
    );
    context.commands.register(commands.write, async (params) => {
      const value = objectValue(params);
      const path = requiredString(value, "path");
      await writeText(context.workspace, path, requiredString(value, "content", true));
      context.events.emit("workspace.changed", { path });
      return { path, written: true };
    });
    context.commands.register(commands.search, (params) => {
      const value = objectValue(params);
      return search(
        context.workspace,
        requiredString(value, "query"),
        optionalString(value.path),
        optionalString(value.glob),
      );
    });
  },
};

export default extension;

import {
  objectValue,
  optionalNumber,
  optionalString,
  requiredString,
  type HostExtension,
  type JsonValue,
} from "@sand/extension-api";

import { readText, tree, writeText } from "./files.ts";
import { registerGit } from "./git.ts";
import { registerOpenCommands } from "./open.ts";
import { registerProjects } from "./projects.ts";
import { search } from "./search.ts";

const extension: HostExtension = {
  async activate(context) {
    context.commands.register("workspace.info", () => ({ root: context.workspace }));
    context.commands.register("workspace.tree", (params) => {
      const value = objectValue(params);
      return tree(
        context.workspace,
        optionalString(value.path) || ".",
        optionalNumber(value.depth) || 5,
      ) as unknown as Promise<JsonValue>;
    });
    context.commands.register("workspace.read", (params) =>
      readText(context.workspace, requiredString(objectValue(params), "path"))
    );
    context.commands.register("workspace.write", async (params) => {
      const value = objectValue(params);
      const path = requiredString(value, "path");
      await writeText(context.workspace, path, requiredString(value, "content", true));
      context.events.emit("workspace.changed", { path });
      return { path, written: true };
    });
    context.commands.register("workspace.search", (params) => {
      const value = objectValue(params);
      return search(
        context.workspace,
        requiredString(value, "query"),
        optionalString(value.path),
        optionalString(value.glob),
      );
    });
    await registerProjects(context);
    registerGit(context);
    registerOpenCommands(context);
  },
};

export default extension;

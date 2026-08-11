import { join } from "node:path";

import {
  objectValue,
  requiredString,
  type JsonValue,
  type WorkspaceDescription,
} from "@sand/extension-api";

import type { ProtocolWriter } from "../events.ts";
import { Dependencies } from "../extensions/dependencies.ts";
import { coreModuleNames } from "../modules.ts";
import { Settings } from "../settings.ts";
import { WorkspaceContext } from "./context.ts";

interface ManagerOptions {
  appRoot: string;
  home: string;
  builtinExtensions: string;
  version: string;
  write: ProtocolWriter;
}

export class WorkspaceManager {
  private readonly contexts = new Map<string, WorkspaceContext>();
  private readonly cache: string;
  private readonly dependencies: Dependencies;
  private readonly settings: Settings;

  private constructor(
    private readonly options: ManagerOptions,
    settings: Settings,
  ) {
    this.cache = join(options.home, "cache", "bundles", options.version);
    this.dependencies = new Dependencies(
      join(options.home, "cache", "dependencies"),
      new Set(coreModuleNames(options.appRoot)),
    );
    this.settings = settings;
  }

  static async create(options: ManagerOptions): Promise<WorkspaceManager> {
    return new WorkspaceManager(
      options,
      await Settings.load(join(options.home, "settings.json")),
    );
  }

  async open(params: JsonValue): Promise<JsonValue> {
    const object = objectValue(params);
    const workspace = description(object.workspace);
    const existing = this.contexts.get(workspace.id);
    if (existing) {
      if (
        existing.workspace.path !== workspace.path
        || existing.workspace.home !== workspace.home
      ) {
        throw new Error(`workspace identity does not match open context: ${workspace.id}`);
      }
      return existing.workspace as unknown as JsonValue;
    }
    const context = await WorkspaceContext.open(workspace, object.snapshot ?? null, {
      appRoot: this.options.appRoot,
      home: this.options.home,
      cache: this.cache,
      extensionRoots: [
        { path: this.options.builtinExtensions, source: "builtin" },
        { path: join(this.options.home, "extensions"), source: "user" },
      ],
      settings: this.settings,
      dependencies: this.dependencies,
      write: this.options.write,
    });
    this.contexts.set(workspace.id, context);
    return workspace as unknown as JsonValue;
  }

  async close(params: JsonValue): Promise<JsonValue> {
    const id = requiredString(objectValue(params), "id");
    const context = this.contexts.get(id);
    if (!context) throw new Error(`unknown workspace: ${id}`);
    await context.close();
    this.contexts.delete(id);
    return true;
  }

  async dispatch(
    workspaceId: string | undefined,
    method: string,
    params: JsonValue,
  ): Promise<JsonValue> {
    if (!workspaceId) throw new Error("workspaceId is required");
    const context = this.contexts.get(workspaceId);
    if (!context) throw new Error(`unknown workspace: ${workspaceId}`);
    if (method === "extensions.reload") {
      let selected: JsonValue = null;
      for (const [id, workspace] of this.contexts) {
        const extensions = await workspace.reloadExtensions();
        if (id === workspaceId) selected = extensions as unknown as JsonValue;
      }
      return selected;
    }
    return context.dispatch(method, params);
  }
}

function description(value: JsonValue | undefined): WorkspaceDescription {
  const object = objectValue(value ?? null);
  return {
    id: requiredString(object, "id"),
    path: requiredString(object, "path"),
    home: requiredString(object, "home"),
  };
}

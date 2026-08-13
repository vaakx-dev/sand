import type {
  ExtensionDescription,
  JsonValue,
  WorkspaceDescription,
} from "@sand/extension-api";
import { objectValue, requiredString } from "@sand/extension-api";

import { Events, type ProtocolWriter } from "../events.ts";
import { Dependencies } from "../extensions/dependencies.ts";
import type { Root } from "../extensions/discovery.ts";
import { Manager as ExtensionManager } from "../extensions/manager.ts";
import { Registry } from "../extensions/registry.ts";
import { CoreModules } from "../modules.ts";
import { Settings } from "../settings.ts";
import { registerThreadCommands } from "../threads/commands.ts";
import { ThreadLifecycle } from "../threads/lifecycle.ts";
import { ThreadStore } from "../threads/store.ts";

interface ContextOptions {
  appRoot: string;
  home: string;
  cache: string;
  extensionRoots: Root[];
  settings: Settings;
  dependencies: Dependencies;
  core: CoreModules;
  write: ProtocolWriter;
}

export class WorkspaceContext {
  private readonly events: Events;
  private readonly registry: Registry;
  private readonly threads: ThreadStore;
  private readonly extensions: ExtensionManager;

  private constructor(
    readonly workspace: WorkspaceDescription,
    private readonly options: ContextOptions,
  ) {
    this.events = new Events(options.write, workspace.id);
    this.registry = new Registry(
      options.home,
      workspace,
      options.settings,
      this.events,
    );
    this.threads = new ThreadStore(this.events);
    registerThreadCommands(
      this.registry,
      new ThreadLifecycle(this.threads, options.settings, this.events),
      this.threads,
    );
    this.extensions = new ExtensionManager(
      options.extensionRoots,
      options.core,
      options.settings,
      this.registry,
      options.dependencies,
    );
  }

  static async open(
    workspace: WorkspaceDescription,
    snapshot: JsonValue,
    options: ContextOptions,
  ): Promise<WorkspaceContext> {
    const context = new WorkspaceContext(workspace, options);
    context.threads.restore(snapshot);
    await context.extensions.reload();
    context.events.emit("workspace.ready", {
      workspace,
      extensions: context.extensions.list().length,
    } as unknown as JsonValue);
    return context;
  }

  async close(): Promise<void> {
    await this.extensions.close();
  }

  reloadExtensions(): Promise<ExtensionDescription[]> {
    return this.extensions.reload();
  }

  async dispatch(method: string, params: JsonValue): Promise<JsonValue> {
    const object = objectValue(params);
    switch (method) {
      case "runtime.info":
        return {
          appRoot: this.options.appRoot,
          home: this.options.home,
          cache: this.options.cache,
          bun: Bun.version,
          workspace: this.workspace,
        } as unknown as JsonValue;
      case "extensions.list":
        return this.extensions.list() as unknown as JsonValue;
      case "extensions.ui":
        return (await this.extensions.uiBundles()) as unknown as JsonValue;
      case "settings.all":
        return this.options.settings.all();
      case "settings.set":
        await this.options.settings.set(requiredString(object, "key"), object.value ?? null);
        return this.options.settings.all();
      case "commands.execute": {
        const id = requiredString(object, "id");
        return (await this.registry.execute<JsonValue>(id, object.params ?? null)) ?? null;
      }
    }
    if (this.registry.command(method)) return this.registry.execute<JsonValue>(method, params);
    throw new Error(`unknown runtime method: ${method}`);
  }
}

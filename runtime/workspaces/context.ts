import type {
  ExtensionDescription,
  JsonValue,
  WorkspaceDescription,
} from "@sand/extension-api";
import { objectValue, requiredString } from "@sand/extension-api";

import { AgentHarness } from "../agent.ts";
import { Events, type ProtocolWriter } from "../events.ts";
import { Dependencies } from "../extensions/dependencies.ts";
import type { Root } from "../extensions/discovery.ts";
import { Manager as ExtensionManager } from "../extensions/manager.ts";
import { Registry } from "../extensions/registry.ts";
import { Settings } from "../settings.ts";

interface ContextOptions {
  appRoot: string;
  home: string;
  cache: string;
  extensionRoots: Root[];
  settings: Settings;
  dependencies: Dependencies;
  write: ProtocolWriter;
}

export class WorkspaceContext {
  private readonly events: Events;
  private readonly registry: Registry;
  private readonly agent: AgentHarness;
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
    this.agent = new AgentHarness(this.registry, options.settings, this.events);
    this.extensions = new ExtensionManager(
      options.extensionRoots,
      options.cache,
      options.appRoot,
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
    context.agent.restore(snapshot);
    await context.extensions.reload();
    context.events.emit("workspace.ready", {
      workspace,
      extensions: context.extensions.list().length,
    } as unknown as JsonValue);
    return context;
  }

  async close(): Promise<void> {
    await this.agent.shutdown();
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
      case "agent.providers":
        return this.agent.providers();
      case "agent.tools":
        return this.agent.tools();
      case "agent.tool.execute":
        return this.agent.tool(
          requiredString(object, "name"),
          objectValue(object.input ?? null),
        );
    }
    if (this.registry.command(method)) return this.registry.execute<JsonValue>(method, params);
    throw new Error(`unknown runtime method: ${method}`);
  }
}

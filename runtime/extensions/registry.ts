import type {
  AppExtensionContext,
  EventApi,
  ExtensionApis,
  ExtensionManifest,
  RuntimeCommand,
  SettingsApi,
  WorkspaceDescription,
} from "@sand/extension-api";

export class Registry {
  readonly commands = new Map<string, RuntimeCommand>();
  private readonly internalCommands = new Map<string, RuntimeCommand>();

  constructor(
    private readonly home: string,
    private readonly workspace: WorkspaceDescription,
    private readonly settings: SettingsApi,
    private readonly events: EventApi,
  ) {}

  clear(): void {
    this.commands.clear();
  }

  registerInternal(id: string, command: RuntimeCommand): void {
    register(this.internalCommands, "internal command", id, command);
  }

  command(id: string): RuntimeCommand | undefined {
    return this.internalCommands.get(id) ?? this.commands.get(id);
  }

  async execute<T = unknown>(
    id: string,
    params: Parameters<RuntimeCommand>[0],
    signal?: AbortSignal,
  ): Promise<T> {
    const command = this.command(id);
    if (!command) throw new Error(`unknown command: ${id}`);
    return await command(params, signal) as T;
  }

  context(
    manifest: ExtensionManifest,
    root: string,
    contributions: string[],
    apis: ExtensionApis,
  ): AppExtensionContext {
    return {
      manifest,
      root,
      home: this.home,
      workspace: this.workspace,
      settings: this.settings,
      events: this.events,
      apis,
      commands: {
        register: (id, command) => {
          register(this.commands, "command", id, command);
          contributions.push(`command:${id}`);
        },
        execute: (id, params = null, signal) => this.execute(id, params, signal),
      },
    };
  }
}

function register<T>(items: Map<string, T>, kind: string, id: string, value: T): void {
  if (items.has(id)) throw new Error(`${kind} already registered: ${id}`);
  items.set(id, value);
}

import type {
  AgentProvider,
  AgentTool,
  EventApi,
  ExtensionManifest,
  HostExtensionContext,
  RuntimeCommand,
  SettingsApi,
} from "@sand/extension-api";

export class Registry {
  readonly commands = new Map<string, RuntimeCommand>();
  readonly providers = new Map<string, AgentProvider>();
  readonly tools = new Map<string, AgentTool>();
  private readonly internalCommands = new Map<string, RuntimeCommand>();

  constructor(
    private readonly config: string,
    private readonly workspace: string,
    private readonly settings: SettingsApi,
    private readonly events: EventApi,
  ) {}

  clear(): void {
    this.commands.clear();
    this.providers.clear();
    this.tools.clear();
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

  context(manifest: ExtensionManifest, contributions: string[]): HostExtensionContext {
    return {
      manifest,
      config: this.config,
      workspace: this.workspace,
      settings: this.settings,
      events: this.events,
      commands: {
        register: (id, command) => {
          register(this.commands, "command", id, command);
          contributions.push(`command:${id}`);
        },
        execute: (id, params = null, signal) => this.execute(id, params, signal),
      },
      providers: {
        register: (provider) => {
          register(this.providers, "provider", provider.id, provider);
          contributions.push(`provider:${provider.id}`);
        },
      },
      tools: {
        register: (tool) => {
          register(this.tools, "tool", tool.definition.name, tool);
          contributions.push(`tool:${tool.definition.name}`);
        },
      },
    };
  }
}

function register<T>(items: Map<string, T>, kind: string, id: string, value: T): void {
  if (items.has(id)) throw new Error(`${kind} already registered: ${id}`);
  items.set(id, value);
}

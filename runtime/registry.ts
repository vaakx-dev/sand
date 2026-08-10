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

  context(manifest: ExtensionManifest, contributions: string[]): HostExtensionContext {
    return {
      manifest,
      config: this.config,
      workspace: this.workspace,
      settings: this.settings,
      events: this.events,
      commands: {
        register: (id, command) => {
          if (this.commands.has(id)) throw new Error(`command already registered: ${id}`);
          this.commands.set(id, command);
          contributions.push(`command:${id}`);
        },
      },
      providers: {
        register: (provider) => {
          if (this.providers.has(provider.id)) {
            throw new Error(`provider already registered: ${provider.id}`);
          }
          this.providers.set(provider.id, provider);
          contributions.push(`provider:${provider.id}`);
        },
      },
      tools: {
        register: (tool) => {
          if (this.tools.has(tool.definition.name)) {
            throw new Error(`tool already registered: ${tool.definition.name}`);
          }
          this.tools.set(tool.definition.name, tool);
          contributions.push(`tool:${tool.definition.name}`);
        },
      },
    };
  }
}

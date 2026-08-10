import type { JsonObject, JsonValue } from "@sand/extension-api";

import { Events } from "./events.ts";
import { registerExecutionCommands } from "./execution/commands.ts";
import { ExecutionCoordinator } from "./execution/coordinator.ts";
import { Registry } from "./extensions/registry.ts";
import { Settings } from "./settings.ts";
import { registerThreadCommands } from "./threads/commands.ts";
import { ThreadLifecycle } from "./threads/lifecycle.ts";
import { ThreadStore } from "./threads/store.ts";
import { TitleGenerator } from "./threads/title.ts";

export class AgentHarness {
  private readonly threads: ThreadStore;

  constructor(
    private readonly registry: Registry,
    settings: Settings,
    events: Events,
  ) {
    this.threads = new ThreadStore(events);
    const titles = new TitleGenerator(registry, settings, events, this.threads);
    const lifecycle = new ThreadLifecycle(this.threads, settings, events);
    const execution = new ExecutionCoordinator(registry, settings, events, this.threads, titles);
    registerThreadCommands(registry, lifecycle, this.threads);
    registerExecutionCommands(registry, execution);
  }

  restore(snapshot: JsonValue): void {
    this.threads.restore(snapshot);
  }

  providers(): JsonValue {
    return [...this.registry.providers.values()].map((provider) => ({
      id: provider.id,
      name: provider.name,
      defaultModel: provider.defaultModel ?? "",
      modelDefaults: provider.modelDefaults,
      models: provider.models,
      presentation: provider.presentation,
    })) as unknown as JsonValue;
  }

  tools(): JsonValue {
    return [...this.registry.tools.values()].map((tool) => tool.definition) as unknown as JsonValue;
  }

  async tool(name: string, input: JsonObject): Promise<JsonValue> {
    const tool = this.registry.tools.get(name);
    if (!tool) throw new Error(`unknown tool: ${name}`);
    return tool.execute(input, new AbortController().signal);
  }
}

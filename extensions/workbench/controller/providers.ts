import {
  errorMessage,
  type AgentProviderConnectionState,
  type AgentProviderDescription,
  type JsonValue,
} from "@sand/extension-api";

import { findProvider } from "../modelCatalog.ts";
import { ControllerRuntime } from "./runtime.ts";
import { providerConnectionValue } from "./values.ts";

export class ProvidersController {
  constructor(
    private readonly runtime: ControllerRuntime,
    private readonly select: (id: string) => Promise<void>,
  ) {}

  async connect(id: string): Promise<void> {
    await this.run(id, "connect", async (provider, command) => {
      this.runtime.notice(`Connecting ${provider.name}`);
      const state = providerConnectionValue(await this.runtime.command<JsonValue>(command));
      this.setState(id, state);
      if (state.available) await this.select(id);
      this.runtime.notice(state.label);
    });
  }

  async disconnect(id: string): Promise<void> {
    await this.run(id, "disconnect", async (_provider, command) => {
      const state = providerConnectionValue(await this.runtime.command<JsonValue>(command));
      this.setState(id, state);
      this.runtime.notice(state.label);
    });
  }

  private async run(
    id: string,
    action: "connect" | "disconnect",
    task: (provider: AgentProviderDescription, command: string) => Promise<void>,
  ): Promise<void> {
    const state = this.runtime.state;
    if (state.providerConnectionBusy.get()[id]) return;
    const provider = findProvider(state.providers.get(), id);
    const connection = provider?.presentation?.connection;
    if (!provider || !connection) return;
    this.setBusy(id, true);
    try {
      await task(
        provider,
        action === "connect" ? connection.connectCommand : connection.disconnectCommand,
      );
    } catch (error) {
      this.runtime.notice(errorMessage(error));
    } finally {
      this.setBusy(id, false);
    }
  }

  private setState(id: string, value: AgentProviderConnectionState): void {
    this.runtime.state.providerConnections.update((states) => ({ ...states, [id]: value }));
  }

  private setBusy(id: string, value: boolean): void {
    this.runtime.state.providerConnectionBusy.update((states) => ({ ...states, [id]: value }));
  }
}

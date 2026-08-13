import { errorMessage } from "@sand/extension-api";

import { findProvider } from "../modelCatalog.ts";
import { ControllerRuntime } from "./runtime.ts";

export class ProvidersController {
  constructor(
    private readonly runtime: ControllerRuntime,
    private readonly refresh: () => Promise<void>,
    private readonly select: (id: string) => Promise<void>,
  ) {}

  async connect(id: string): Promise<void> {
    await this.run(id, async (provider) => {
      this.runtime.notice(`Connecting ${provider.name}`);
      await provider.connection!.connect();
      await this.refresh();
      const state = this.runtime.state.providerConnections.get()[id];
      if (!state) throw new Error(`provider connection state is unavailable: ${id}`);
      if (state.available) await this.select(id);
      this.runtime.notice(state.label);
    });
  }

  async disconnect(id: string): Promise<void> {
    await this.run(id, async (provider) => {
      await provider.connection!.disconnect();
      await this.refresh();
      const state = this.runtime.state.providerConnections.get()[id];
      if (!state) throw new Error(`provider connection state is unavailable: ${id}`);
      this.runtime.notice(state.label);
    });
  }

  private async run(
    id: string,
    task: (provider: NonNullable<ReturnType<typeof findProvider>>) => Promise<void>,
  ): Promise<void> {
    const state = this.runtime.state;
    if (state.providerConnectionBusy.get()[id]) return;
    const provider = findProvider(state.providers.get(), id);
    const connection = provider?.connection;
    if (!provider || !connection) return;
    this.setBusy(id, true);
    try {
      await task(provider);
    } catch (error) {
      this.runtime.notice(errorMessage(error));
    } finally {
      this.setBusy(id, false);
    }
  }

  private setBusy(id: string, value: boolean): void {
    this.runtime.state.providerConnectionBusy.update((states) => ({ ...states, [id]: value }));
  }
}

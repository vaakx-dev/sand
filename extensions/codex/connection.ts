import {
  acpRuntime,
  errorMessage,
  type AgentProviderConnectionState,
  type RuntimeCalls,
} from "@sand/extension-api";

import { commands, type Launch } from "./api.ts";

const AGENT_ID = "codex";

export class CodexConnection {
  constructor(private readonly runtime: RuntimeCalls) {}

  async status(): Promise<AgentProviderConnectionState> {
    const connected = await this.connected();
    if (connected) {
      return {
        available: true,
        label: "Connected",
        description: "Sand is connected to the Codex CLI.",
      };
    }
    try {
      await this.launch();
      return {
        available: false,
        label: "Disconnected",
        description: "Connect the installed Codex CLI to use its models in Sand.",
      };
    } catch (error) {
      return {
        available: false,
        label: "Unavailable",
        description: errorMessage(error),
      };
    }
  }

  async connect(): Promise<void> {
    if (await this.connected()) return;
    const launch = await this.launch();
    await acpRuntime(this.runtime).connect({
      id: AGENT_ID,
      command: launch.command,
      args: launch.args,
    });
  }

  async tryConnect(): Promise<boolean> {
    try {
      await this.connect();
      return true;
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (!await this.connected()) return;
    await acpRuntime(this.runtime).disconnect(AGENT_ID);
  }

  private async connected(): Promise<boolean> {
    const providers = await this.runtime.call<{ id: string }[]>("agent.providers");
    return providers.some((provider) => provider.id === AGENT_ID);
  }

  private launch(): Promise<Launch> {
    return this.runtime.command<Launch>(commands.launch);
  }
}

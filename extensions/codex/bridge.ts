import { CodexApprovals } from "./approvals.ts";
import { loadCatalog, PROVIDER_META, type ProviderCatalog } from "./catalog.ts";
import { CodexSessions } from "./sessions.ts";
import type { RpcPeer } from "./rpc.ts";
import { object, text } from "./protocol.ts";

export class CodexBridge {
  private readonly approvals: CodexApprovals;
  private readonly sessions: CodexSessions;
  private ready?: Promise<void>;
  private userAgent = "Codex CLI";
  private catalog?: ProviderCatalog;

  constructor(
    acp: RpcPeer,
    private readonly codex: RpcPeer,
  ) {
    this.approvals = new CodexApprovals(acp);
    this.sessions = new CodexSessions(acp, codex, () => {
      if (!this.catalog) throw new Error("Codex model catalog is not ready");
      return this.catalog;
    });
  }

  start(): void {
    this.ready ??= this.initializeCodex();
  }

  async requestFromAcp(method: string, params: unknown): Promise<unknown> {
    await this.requireReady();
    switch (method) {
      case "initialize":
        return {
          protocolVersion: 1,
          agentCapabilities: { loadSession: true, promptCapabilities: {} },
          authMethods: [],
          agentInfo: { name: "codex", title: "Codex CLI", version: this.userAgent },
          _meta: { [PROVIDER_META]: this.catalog },
        };
      case "session/new":
        return this.sessions.create(params);
      case "session/load":
        return this.sessions.load(params);
      case "session/prompt":
        return this.sessions.prompt(params);
      case "session/set_mode":
        return {};
      case "session/set_config_option":
        return this.sessions.configure(params);
      default:
        throw new Error(`unsupported ACP request: ${method}`);
    }
  }

  async notificationFromAcp(method: string, params: unknown): Promise<void> {
    await this.requireReady();
    if (method === "session/cancel") this.sessions.cancel(params);
  }

  requestFromCodex(method: string, params: unknown): Promise<unknown> {
    return this.approvals.handle(method, params);
  }

  notificationFromCodex(method: string, params: unknown): void {
    this.sessions.publish(method, params);
  }

  fail(error: Error): void {
    this.sessions.fail(error);
  }

  private async initializeCodex(): Promise<void> {
    const response = object(await this.codex.request("initialize", {
      clientInfo: {
        name: "sand_codex_extension",
        title: "Sand Codex Extension",
        version: "0.0.1",
      },
      capabilities: null,
    }));
    this.userAgent = text(response.userAgent) || this.userAgent;
    this.codex.notify("initialized", {});
    this.catalog = await loadCatalog(this.codex);
  }

  private requireReady(): Promise<void> {
    if (!this.ready) throw new Error("Codex bridge has not started");
    return this.ready;
  }
}

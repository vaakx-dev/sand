import type { RpcPeer } from "./rpc.ts";
import {
  defaultConfiguration,
  selectModel,
  sessionConfigOptions,
  type ProviderCatalog,
} from "./catalog.ts";
import {
  array,
  object,
  requiredText,
  text,
  type ActiveTurn,
  type CodexThread,
  type Session,
} from "./protocol.ts";
import { publishCodexNotification, replay, sessionInfo } from "./updates.ts";

export class CodexSessions {
  private readonly sessions = new Map<string, Session>();

  constructor(
    private readonly acp: RpcPeer,
    private readonly codex: RpcPeer,
    private readonly catalog: () => ProviderCatalog,
  ) {}

  async create(params: unknown): Promise<unknown> {
    const value = object(params);
    const cwd = requiredText(value.cwd, "cwd");
    const configuration = defaultConfiguration(this.catalog());
    const purpose = text(object(value._meta)["sand.app/purpose"]);
    const response = object(await this.codex.request("thread/start", {
      cwd,
      model: configuration.model,
      ...(purpose === "thread_title" ? { ephemeral: true } : {}),
    }));
    const thread = object(response.thread) as unknown as CodexThread;
    const id = requiredText(thread.id, "Codex thread id");
    this.sessions.set(id, { id, cwd, ...configuration });
    return {
      sessionId: id,
      configOptions: sessionConfigOptions(this.catalog(), configuration),
    };
  }

  async load(params: unknown): Promise<unknown> {
    const value = object(params);
    const id = requiredText(value.sessionId, "sessionId");
    const cwd = requiredText(value.cwd, "cwd");
    const response = object(await this.codex.request("thread/resume", { threadId: id, cwd }));
    const thread = object(response.thread) as unknown as CodexThread;
    const configuration = defaultConfiguration(this.catalog());
    this.sessions.set(id, { id, cwd, ...configuration });
    sessionInfo(this.acp, id, thread.name || thread.preview || "");
    replay(this.acp, id, thread.turns ?? []);
    return { configOptions: sessionConfigOptions(this.catalog(), configuration) };
  }

  configure(params: unknown): unknown {
    const value = object(params);
    const session = this.sessions.get(requiredText(value.sessionId, "sessionId"));
    if (!session) throw new Error("unknown Codex session");
    const configId = requiredText(value.configId, "configId");
    const selected = requiredText(value.value, "configuration value");
    if (configId === "model") {
      selectModel(this.catalog(), session, selected);
    } else if (configId === "reasoning") {
      session.reasoning = selected;
    } else if (configId === "serviceTier") {
      session.serviceTier = selected;
    } else {
      throw new Error(`unknown Codex configuration: ${configId}`);
    }
    return { configOptions: sessionConfigOptions(this.catalog(), session) };
  }

  async prompt(params: unknown): Promise<unknown> {
    const value = object(params);
    const id = requiredText(value.sessionId, "sessionId");
    const session = this.sessions.get(id);
    if (!session) throw new Error(`unknown Codex session: ${id}`);
    if (session.active) throw new Error("Codex session is already running");
    const prompt = promptText(value.prompt);
    if (!prompt) throw new Error("prompt is required");

    let resolveTurn!: ActiveTurn["resolve"];
    let rejectTurn!: ActiveTurn["reject"];
    const stopReason = new Promise<"end_turn" | "cancelled">((resolve, reject) => {
      resolveTurn = resolve;
      rejectTurn = reject;
    });
    const active: ActiveTurn = {
      cancelled: false,
      streamed: new Map(),
      resolve: resolveTurn,
      reject: rejectTurn,
    };
    session.active = active;
    try {
      const response = object(await this.codex.request("turn/start", {
        threadId: id,
        input: [{ type: "text", text: prompt }],
        model: session.model,
        ...(session.reasoning ? { effort: session.reasoning } : {}),
        ...(session.serviceTier && session.serviceTier !== "standard"
          ? { serviceTier: session.serviceTier }
          : {}),
      }));
      active.id = requiredText(object(response.turn).id, "Codex turn id");
      if (active.cancelled && session.active === active) this.interrupt(session, active);
      return { stopReason: await stopReason };
    } catch (error) {
      if (session.active === active) session.active = undefined;
      throw error;
    }
  }

  cancel(params: unknown): void {
    const session = this.sessions.get(requiredText(object(params).sessionId, "sessionId"));
    if (!session?.active) return;
    session.active.cancelled = true;
    if (session.active.id) this.interrupt(session, session.active);
  }

  publish(method: string, params: unknown): void {
    const value = object(params);
    const session = this.sessions.get(text(value.threadId));
    if (session) publishCodexNotification(this.acp, session, method, value);
  }

  fail(error: Error): void {
    for (const session of this.sessions.values()) session.active?.reject(error);
  }

  private interrupt(session: Session, active: ActiveTurn): void {
    void this.codex.request("turn/interrupt", {
      threadId: session.id,
      turnId: active.id,
    }).catch(() => {});
  }
}

function promptText(value: unknown): string {
  return array(value).map((entry) => {
    const block = object(entry);
    if (block.type === "text") return requiredText(block.text, "prompt text");
    if (block.type === "resource_link") {
      return [text(block.name), text(block.uri)].filter(Boolean).join(": ");
    }
    throw new Error(`unsupported prompt content: ${String(block.type || "unknown")}`);
  }).filter(Boolean).join("\n\n").trim();
}

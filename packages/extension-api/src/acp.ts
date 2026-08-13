import type { JsonObject, JsonValue } from "./json.ts";

export type AcpAgentStatus = "connecting" | "connected" | "disconnected";
export type AcpSessionStatus = "idle" | "running" | "error" | "interrupted";

export interface AcpAgentRecord {
  id: string;
  command: string;
  args: string[];
  env: string[];
  status: AcpAgentStatus;
  protocolVersion?: JsonValue;
  capabilities?: JsonValue;
  authMethods?: JsonValue;
  implementation?: JsonValue;
  meta?: JsonValue;
  createdAt: string;
  updatedAt: string;
  error?: string;
}

export interface AcpSessionRecord {
  id: string;
  agentId: string;
  acpSessionId: string;
  cwd: string;
  threadId?: string;
  status: AcpSessionStatus;
  runId?: string;
  attemptId?: string;
  modes?: JsonValue;
  configOptions?: JsonValue;
  meta?: JsonValue;
  stopReason?: JsonValue;
  createdAt: string;
  updatedAt: string;
  error?: string;
}

export interface AcpConnectRequest {
  id: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface AcpNewSessionRequest {
  agentId: string;
  cwd?: string;
  threadId?: string;
}

export interface AcpPromptRequest {
  id: string;
  prompt: string;
  threadId: string;
  runId: string;
  attemptId: string;
}

export interface AcpSetModeRequest {
  id: string;
  modeId: string;
}

export interface AcpSetConfigRequest {
  id: string;
  configId: string;
  value: JsonValue;
}

interface RuntimeCaller {
  call<T = JsonValue>(method: string, params?: JsonValue): Promise<T>;
}

export interface AcpRuntime {
  agents(): Promise<AcpAgentRecord[]>;
  sessions(): Promise<AcpSessionRecord[]>;
  session(id: string): Promise<AcpSessionRecord>;
  connect(request: AcpConnectRequest): Promise<AcpAgentRecord>;
  disconnect(id: string): Promise<boolean>;
  authenticate(agentId: string, methodId: string): Promise<JsonValue>;
  newSession(request: AcpNewSessionRequest): Promise<AcpSessionRecord>;
  loadSession(id: string): Promise<AcpSessionRecord>;
  prompt(request: AcpPromptRequest): Promise<JsonValue>;
  cancel(id: string): Promise<boolean>;
  setMode(request: AcpSetModeRequest): Promise<AcpSessionRecord>;
  setConfig(request: AcpSetConfigRequest): Promise<AcpSessionRecord>;
}

export function acpRuntime(runtime: RuntimeCaller): AcpRuntime {
  const call = <T>(method: string, params?: object) =>
    runtime.call<T>(method, params as JsonObject | undefined);
  return {
    agents: () => call("acp.agents"),
    sessions: () => call("acp.sessions"),
    session: (id) => call("acp.session", { id }),
    connect: (request) => call("acp.connect", request),
    disconnect: (id) => call("acp.disconnect", { id }),
    authenticate: (agentId, methodId) =>
      call("acp.authenticate", { agentId, methodId }),
    newSession: (request) => call("acp.session.new", request),
    loadSession: (id) => call("acp.session.load", { id }),
    prompt: (request) => call("acp.session.prompt", request),
    cancel: (id) => call("acp.session.cancel", { id }),
    setMode: (request) => call("acp.session.setMode", request),
    setConfig: (request) => call("acp.session.setConfig", request),
  };
}

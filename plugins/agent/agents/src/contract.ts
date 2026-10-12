import type { Dispose } from 'drydock'
import type { Effort } from '@sand/llm-accounts/contract'
import type { TurnResult } from '@sand/loops/contract'
import type { Session, WireSession } from '@sand/sessions-sqlite/contract'

export interface AgentDefinition {
  name: string
  description: string
  prompt?: string
  tools?: string[]
  model?: string
  effort?: Effort
}

export interface AgentRequest {
  parent: Session
  task: string
  label?: string
  agent?: string
  model?: string
  effort?: Effort
  origin?: string
  signal?: AbortSignal
  wait?: boolean
}

export interface AgentResult extends TurnResult {
  session: Session
}

export interface Agents {
  define(definition: AgentDefinition): Dispose
  definitions(cwd?: string, project?: string | null): Promise<AgentDefinition[]>
  run(request: AgentRequest): Promise<AgentResult>
}

export type WireAgentRequest = Omit<AgentRequest, 'parent' | 'signal'> & { parent: WireSession }

export type WireAgentResult = Omit<AgentResult, 'session'> & { session: WireSession }

declare module 'drydock' {
  interface Services {
    agents: Agents
  }

  interface Events {
    'agent.start': (session: Session, request: AgentRequest) => void
    'agent.end': (session: Session, result: AgentResult) => void
  }
}

declare module '@sand/protocol/wire' {
  interface WireEvents {
    'agent.start': [session: WireSession, request: WireAgentRequest]
    'agent.end': [session: WireSession, result: WireAgentResult]
  }
}

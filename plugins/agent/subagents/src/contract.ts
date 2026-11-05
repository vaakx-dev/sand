import type { Effort } from '@sand/accounts/contract'
import type { Session } from '@sand/chats/contract'
import type { TurnResult } from '@sand/turns-contract/contract'
import type { Tier } from '@sand/sub-model/contract'
import { service } from 'drydock'

export interface AgentDefinition {
  name: string
  description: string
  prompt?: string
  tools?: string[]
  model?: string
  effort?: Effort
  tier?: Tier
}

export interface AgentRequest {
  parent: Session
  task: string
  label?: string
  agent?: string
  model?: string
  effort?: Effort
  origin?: string
}

export interface AgentResult extends TurnResult {
  session: Session
}

export interface AgentMeta {
  name: string
  depth: number
  tools?: string[]
}

export interface AgentLimits {
  child(parent: Session, name: string, tools?: string[]): AgentMeta
  give(session: Session, meta: AgentMeta): void
  covers(caller: Session, target: Session): boolean
}

export const agentLimits = service<AgentLimits>('agentLimits')

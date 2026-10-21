import type { Effort } from '@sand/accounts/contract'
import type { Session } from '@sand/chats/contract'
import type { TurnResult } from '@sand/loop/contract'

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

import type { Effort } from '@sand/accounts/contract'
import type { Session } from '@sand/chats/contract'
import type { TurnResult } from '@sand/loop/contract'
import type { Tier } from '@sand/sub-model/contract'

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

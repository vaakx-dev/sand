import type { Effort } from '@sand/accounts/contract'
import type { Does } from './does'

export interface AgentDefinition {
  name: string
  description: string
  prompt?: string
  tools?: string[]
  model?: string
  effort?: Effort
  does?: Does
}

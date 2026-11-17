import type { Effort } from '@sand/accounts/contract'
import type { Level } from '@sand/model/contract'

export interface AgentDefinition {
  name: string
  description: string
  prompt?: string
  tools?: string[]
  model?: string
  effort?: Effort
  level?: Level
}

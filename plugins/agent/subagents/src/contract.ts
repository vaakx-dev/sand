import type { Effort } from '@sand/accounts/contract'
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

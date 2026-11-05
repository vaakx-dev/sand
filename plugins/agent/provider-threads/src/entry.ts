import type { HandoffStrategy } from '@sand/turns-contract/contract'

export interface HandoffEntry {
  handoff: string
  strategy: HandoffStrategy
  model: string
  from: string[]
  selected: number
  omitted: number
  tokens: number
}

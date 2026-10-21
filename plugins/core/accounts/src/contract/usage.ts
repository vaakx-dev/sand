import type { Billing } from './models'

export interface Usage {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}

export interface UsageRecord {
  id: string
  model?: string
  source?: string
  account?: string
  provider?: string
  billing?: Billing
  plan?: string
  pc?: string
  pcName?: string
  usage: Usage
}

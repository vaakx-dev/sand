import type { Usage } from '@sand/messages'
import type { Billing } from './llm'

export type UsageBucket = 'hour' | 'day'

export interface UsageQuery {
  since: number
  bucket: UsageBucket
  zone: string
}

export interface UsageTotals {
  usage: Usage
  turns: number
  cost: number
  billed: number
  unpriced: number
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

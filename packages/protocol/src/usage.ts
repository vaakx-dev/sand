import type { Limits, Usage } from './llm'

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
  unpriced: number
}

export interface ModelUsage extends UsageTotals {
  model: string
  label: string
}

export interface PeriodUsage extends UsageTotals {
  key: string
}

export interface ThreadUsage extends UsageTotals {
  id: string
  title: string | null
  cwd: string
  agents: number
}

export interface UsageSummary extends UsageQuery {
  until: number
  total: UsageTotals & { threads: number }
  models: ModelUsage[]
  periods: PeriodUsage[]
  threads: ThreadUsage[]
  limits?: Limits
}

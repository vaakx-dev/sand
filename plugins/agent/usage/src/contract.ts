import type { Limits, ProviderInfo } from '@sand/llm-accounts/contract'
import type { Usage } from '@sand/messages'

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

export interface ModelUsage extends UsageTotals {
  model: string
  label: string
  provider: string
}

export interface PeriodUsage extends UsageTotals {
  key: string
  providers: Record<string, UsageTotals>
}

export interface ProviderUsage extends UsageTotals, ProviderInfo {
  threads: number
  limits?: Limits
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
  providers: ProviderUsage[]
  models: ModelUsage[]
  periods: PeriodUsage[]
  threads: ThreadUsage[]
  limits?: Limits
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'usage.summary': UsageQuery
  }
}

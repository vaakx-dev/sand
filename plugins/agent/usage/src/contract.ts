import type { Billing, Limits } from '@sand/llm-accounts/contract'
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

export interface AccountUsage extends UsageTotals {
  key: string
  source: string
  label: string
  provider: string
  billing: Billing
  plan?: string
  pc?: string
  pcName?: string
  threads: number
  limits?: Limits
}

export interface ModelUsage extends UsageTotals {
  model: string
  name: string
  label: string
  provider: string
  account: string
}

export interface PeriodUsage extends UsageTotals {
  key: string
  accounts: Record<string, UsageTotals>
}

export interface ThreadUsage extends UsageTotals {
  id: string
  title: string | null
  cwd: string
  agents: number
  accounts: string[]
}

export interface ProjectUsage extends UsageTotals {
  cwd: string
  threads: number
  accounts: string[]
}

export interface UnpricedModel {
  model: string
  turns: number
  tokens: number
}

export interface UsageSummary extends UsageQuery {
  until: number
  total: UsageTotals & { threads: number }
  accounts: AccountUsage[]
  models: ModelUsage[]
  periods: PeriodUsage[]
  threads: ThreadUsage[]
  projects: ProjectUsage[]
  unpriced: UnpricedModel[]
  limits?: Limits
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'usage.summary': UsageQuery
  }
}

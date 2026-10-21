import type { Billing, Limits, Usage } from '@sand/accounts/contract'
import { request, type } from '@sand/host-hub/contract'
import { z } from 'zod'

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

export interface ProjectUsage extends UsageTotals {
  cwd: string
  accounts: string[]
}

export interface UnpricedModel {
  model: string
  turns: number
  tokens: number
}

export interface UsageSummary extends UsageQuery {
  until: number
  total: UsageTotals
  accounts: AccountUsage[]
  models: ModelUsage[]
  periods: PeriodUsage[]
  projects: ProjectUsage[]
  unpriced: UnpricedModel[]
  limits?: Limits
}

export const usageSummary = request('usage.summary', {
  input: z.object({ since: z.number(), bucket: z.enum(['hour', 'day']), zone: z.string() }),
  output: type<UsageSummary>(),
})

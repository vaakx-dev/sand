import type { Billing, Limits, ModelPrice, Usage } from '@sand/accounts/contract'
import { request, type } from '@sand/host-hub/contract'
import { service } from 'drydock'
import { z } from 'zod'
import type { UsageHistory } from '../forecast/history'

export * from '../records'
export { billedCost } from './billed'
export { usageCost } from './cost'
export { periodLabel, periodTitle } from './period'
export { joinThreadUsage, threadFamily, threadUsage } from '../summary/thread'
export { forecastsOf, type Member, poolForecast, poolState, type PoolState } from '../forecast'
export { type History, historyOf, historyQuery, type HourUsage, type Spend, type UsageHistory } from '../forecast/history'
export { day, hour, startOfHour } from '../forecast/hours'
export type { Forecast, Point } from '../forecast/project'
export { hourKey, keyOf } from '../forecast/keys'

export type UsageBucket = 'hour' | 'day'

export const usageOrigins = ['sand', 'outside'] as const

export type UsageOrigin = (typeof usageOrigins)[number]

export interface UsageQuery {
  since: number
  bucket: UsageBucket
  zone: string
  origin?: UsageOrigin
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
  kind?: string
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

export interface PeriodUsage {
  key: string
  accounts: Record<string, UsageTotals>
  models: Record<string, UsageTotals>
}

export interface ProjectUsage extends UsageTotals {
  cwd: string
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
}

export interface ThreadModel extends UsageTotals {
  name: string
  label: string
  provider: string
  subagents: number
}

export interface ThreadUsage {
  session: string
  total: UsageTotals
  models: ThreadModel[]
}

export interface UsageReader {
  summary(query: UsageQuery): UsageSummary
}

export const usageReader = service<UsageReader>('usageReader')

export interface NativeSessions {
  natives(): Set<string>
}

export const nativeSessions = service<NativeSessions>('nativeSessions')

export const usageSummary = request('usage.summary', {
  input: () => z.object({ since: z.number(), bucket: z.enum(['hour', 'day']), zone: z.string(), origin: z.enum(usageOrigins).optional() }),
  output: type<UsageSummary>(),
})

export const usageHistory = request('usage.history', {
  input: () => z.object({ since: z.number(), zone: z.string() }),
  output: type<UsageHistory>(),
})

export const usagePrices = request('usage.prices', {
  input: () => z.object({ models: z.array(z.string()) }),
  output: type<Record<string, ModelPrice>>(),
})

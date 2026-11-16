import type { AccountUsage, UsageQuery, UsageSummary, UsageTotals } from '../contract'
import { tokensOf } from '../records'
import { day, historyWeeks, startOfHour } from './hours'

export interface Spend {
  cost: number
  tokens: number
}

export interface HourUsage {
  key: string
  accounts: Record<string, Spend>
}

export interface History {
  since: number
  periods: HourUsage[]
}

export interface UsageHistory extends History {
  accounts: AccountUsage[]
}

const spendOf = ({ cost, usage }: UsageTotals): Spend => ({ cost, tokens: tokensOf(usage) })

export const historyQuery = (now: number): UsageQuery => ({
  since: startOfHour(now) - historyWeeks * 7 * day,
  bucket: 'hour',
  zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
})

export const historyOf = ({ since, accounts, periods }: UsageSummary): UsageHistory => ({
  since,
  accounts,
  periods: periods.map(period => ({ key: period.key, accounts: Object.fromEntries(Object.entries(period.accounts).map(([account, totals]) => [account, spendOf(totals)])) })),
})

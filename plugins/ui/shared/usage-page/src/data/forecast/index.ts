import type { PeriodUsage } from '@sand/usage/contract'
import type { Account } from '../types'
import { hourlyOf, weeklyPattern } from './hours'
import { forecastOf, type Forecast } from './project'

export interface History {
  since: number
  periods: PeriodUsage[]
}

export const forecastsOf = (account: Account, history: History, now: number) => {
  const hourly = hourlyOf(history.periods, account.key)
  const pattern = weeklyPattern(hourly, history.since, now)
  return new Map<string, Forecast | undefined>((account.limits?.windows ?? []).map(window => [window.id, forecastOf(window, hourly, pattern, now)]))
}

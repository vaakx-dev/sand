import type { LimitWindow } from '@sand/accounts/contract'
import type { PeriodUsage } from '../contract'
import { hourlyOf, weeklyPattern } from './hours'
import { forecastOf, type Forecast } from './project'

export interface History {
  since: number
  periods: PeriodUsage[]
}

export const forecastsOf = (account: string, windows: LimitWindow[], history: History, now: number) => {
  const hourly = hourlyOf(history.periods, account)
  const pattern = weeklyPattern(hourly, history.since, now)
  return new Map<string, Forecast | undefined>(windows.map(window => [window.id, forecastOf(window, hourly, pattern, now)]))
}

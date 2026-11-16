import type { LimitWindow } from '@sand/accounts/contract'
import type { History } from './history'
import { hourlyOf, weeklyPattern } from './hours'
import { budgetOf, type Drawn, type Forecast, paceAt, projectPool, usedNow } from './project'

export interface Member {
  account: string
  window: LimitWindow
}

export interface PoolState {
  left: number
  pace?: number
}

export const poolForecast = (members: Member[], history: History, now: number): Forecast | undefined => {
  const hourly = hourlyOf(history.periods, [...new Set(members.map(member => member.account))])
  const drawn = members.flatMap(({ account, window }): Drawn[] => {
    const budget = budgetOf(window, now)
    return budget ? [{ ...budget, hourly: hourly.each.get(account) ?? new Map() }] : []
  })
  return drawn.length ? projectPool(drawn, weeklyPattern(hourly.total, history.since, now), now) : undefined
}

export const forecastsOf = (account: string, windows: LimitWindow[], history: History, now: number) =>
  new Map<string, Forecast | undefined>(windows.map(window => [window.id, poolForecast([{ account, window }], history, now)]))

export const poolState = (windows: LimitWindow[], now: number): PoolState => {
  const budgets = windows.flatMap(window => budgetOf(window, now) ?? [])
  const left = 1 - windows.reduce((sum, window) => sum + usedNow(window, now), 0) / Math.max(1, windows.length)
  return { left, ...(budgets.length === windows.length && budgets.length && { pace: paceAt(budgets, now) }) }
}

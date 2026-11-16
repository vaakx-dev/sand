import type { HourUsage, Spend } from './history'
import { hourKey } from './keys'

export const hour = 3_600_000
export const day = 24 * hour

export const historyWeeks = 4
const slots = 7 * 24

export type Hourly = Map<string, number>

export type Pattern = (at: number) => number

type Measure = (spend: Spend) => number

export const startOfHour = (at: number) => {
  const date = new Date(at)
  date.setMinutes(0, 0, 0)
  return date.getTime()
}

const byCost: Measure = spend => spend.cost

const byTokens: Measure = spend => spend.tokens

const measureOf = (periods: HourUsage[], accounts: string[]): Measure =>
  periods.some(period => accounts.some(account => (period.accounts[account]?.cost ?? 0) > 0)) ? byCost : byTokens

const recordOf = (periods: HourUsage[], accounts: string[], measure: Measure) => {
  const record: Hourly = new Map()
  for (const period of periods) {
    const found = accounts.flatMap(account => period.accounts[account] ?? [])
    if (found.length) record.set(period.key, found.reduce((sum, spend) => sum + measure(spend), 0))
  }
  return record
}

export const hourlyOf = (periods: HourUsage[], accounts: string[]) => {
  const measure = measureOf(periods, accounts)
  return {
    total: recordOf(periods, accounts, measure),
    each: new Map(accounts.map(account => [account, recordOf(periods, [account], measure)])),
  }
}

export const spentBetween = (hourly: Hourly, from: number, until: number) => {
  let total = 0
  for (let at = startOfHour(from); at < until; at += hour) total += hourly.get(hourKey(at)) ?? 0
  return total
}

const slotOf = (at: number) => {
  const date = new Date(at)
  return date.getDay() * 24 + date.getHours()
}

const firstUse = (hourly: Hourly, since: number, until: number) => {
  for (let at = startOfHour(since); at < until; at += hour) if (hourly.get(hourKey(at))) return at
  return until
}

const averages = (size: number) => {
  const sums = new Array<number>(size).fill(0)
  const counts = new Array<number>(size).fill(0)
  return {
    add: (index: number, value: number) => {
      sums[index]! += value
      counts[index]! += 1
    },
    at: (index: number) => (counts[index] ? sums[index]! / counts[index]! : undefined),
  }
}

export const weeklyPattern = (hourly: Hourly, since: number, until: number): Pattern => {
  const bySlot = averages(slots)
  const byHour = averages(24)
  for (let at = firstUse(hourly, since, until); at < startOfHour(until); at += hour) {
    const value = hourly.get(hourKey(at)) ?? 0
    bySlot.add(slotOf(at), value)
    byHour.add(new Date(at).getHours(), value)
  }
  return at => bySlot.at(slotOf(at)) ?? byHour.at(new Date(at).getHours()) ?? 0
}

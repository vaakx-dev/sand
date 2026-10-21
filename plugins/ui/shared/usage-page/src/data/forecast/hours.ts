import type { PeriodUsage, UsageQuery } from '@sand/usage/contract'
import { tokensOf } from '@sand/usage/records'
import { hourKey } from '../../range'
import type { FleetView } from '../fleet'

export const hour = 3_600_000
export const day = 24 * hour

const weeks = 4
const slots = 7 * 24

export type Hourly = Map<string, number>

export type Pattern = (at: number) => number

export const startOfHour = (at: number) => {
  const date = new Date(at)
  date.setMinutes(0, 0, 0)
  return date.getTime()
}

export const historyView = (): FleetView => {
  const query: UsageQuery = {
    since: startOfHour(Date.now()) - weeks * 7 * day,
    bucket: 'hour',
    zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }
  return { key: 'history', query }
}

const recordOf = (periods: PeriodUsage[], account: string, measure: (period: PeriodUsage) => number) => {
  const record: Hourly = new Map()
  for (const period of periods) if (period.accounts[account]) record.set(period.key, measure(period))
  return record
}

export const hourlyOf = (periods: PeriodUsage[], account: string): Hourly => {
  const cost = recordOf(periods, account, period => period.accounts[account]!.cost)
  if ([...cost.values()].some(value => value > 0)) return cost
  return recordOf(periods, account, period => tokensOf(period.accounts[account]!.usage))
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

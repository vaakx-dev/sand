import type { PeriodUsage, UsageBucket } from '../contract'
import { grouped } from './grouped'
import { emptyTotals } from './totals'

const formatter = (zone: string) => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }
  try {
    return new Intl.DateTimeFormat('en-CA', { ...options, timeZone: zone })
  } catch {
    return new Intl.DateTimeFormat('en-CA', options)
  }
}

const periodKey = (zone: string, bucket: UsageBucket) => {
  const format = formatter(zone)
  return (at: number) => {
    const parts = Object.fromEntries(format.formatToParts(at).map(part => [part.type, part.value]))
    const day = `${parts.year}-${parts.month}-${parts.day}`
    return bucket === 'day' ? day : `${day} ${parts.hour}`
  }
}

export const periodBook = (zone: string, bucket: UsageBucket) => {
  const keyOf = periodKey(zone, bucket)
  const periods = new Map<string, PeriodUsage>()

  const add = (at: number, account: string) => {
    const key = keyOf(at)
    const period = grouped(periods, key, (): PeriodUsage => ({ ...emptyTotals(), key, accounts: {} }))
    return [period, (period.accounts[account] ??= emptyTotals())] as const
  }

  const finish = () => [...periods.values()].sort((a, b) => a.key.localeCompare(b.key))

  return { add, finish }
}

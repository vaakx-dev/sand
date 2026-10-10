import type { UsageBucket, UsageQuery } from '@sand/usage/contract'

export const ranges = ['24h', '7d', '30d', 'month', '90d'] as const

export type Range = (typeof ranges)[number]

const monthName = () => new Date().toLocaleDateString('en', { month: 'long' })

export const rangeLabel = (range: Range) =>
  range === 'month' ? monthName() : ({ '24h': '24h', '7d': '7 days', '30d': '30 days', '90d': '90 days' } as const)[range]

const hour = 3_600_000

const startOfDay = (daysAgo: number) => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - daysAgo)
  return date.getTime()
}

const startOfMonth = () => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(1)
  return date.getTime()
}

const startOfHour = () => {
  const date = new Date()
  date.setMinutes(0, 0, 0)
  return date.getTime()
}

export const queryFor = (range: Range): UsageQuery => {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (range === '24h') return { since: startOfHour() - 23 * hour, bucket: 'hour', zone }
  if (range === 'month') return { since: startOfMonth(), bucket: 'day', zone }
  return { since: startOfDay(Number(range.slice(0, -1)) - 1), bucket: 'day', zone }
}

const pad = (value: number) => String(value).padStart(2, '0')

const keyOf = (date: Date, bucket: UsageBucket) => {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return bucket === 'day' ? day : `${day} ${pad(date.getHours())}`
}

export const periodKeys = (since: number, until: number, bucket: UsageBucket) => {
  const keys: string[] = []
  const date = new Date(since)
  if (bucket === 'day') date.setHours(0, 0, 0, 0)
  else date.setMinutes(0, 0, 0)
  while (date.getTime() <= until) {
    keys.push(keyOf(date, bucket))
    if (bucket === 'day') date.setDate(date.getDate() + 1)
    else date.setHours(date.getHours() + 1)
  }
  return keys
}

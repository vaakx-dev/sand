import type { UsageQuery } from '../contract'

export const usageRanges = ['24h', '7d', '30d', 'month', '90d'] as const

export type UsageRange = (typeof usageRanges)[number]

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

export const usageQuery = (range: UsageRange): UsageQuery => {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (range === '24h') return { since: startOfHour() - 23 * hour, bucket: 'hour', zone }
  if (range === 'month') return { since: startOfMonth(), bucket: 'day', zone }
  return { since: startOfDay(Number(range.slice(0, -1)) - 1), bucket: 'day', zone }
}

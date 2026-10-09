import type { UsageQuery } from '@sand/usage/contract'

export const ranges = ['24h', '7d', '30d', '90d'] as const

export type Range = (typeof ranges)[number]

const startOfDay = (daysAgo: number) => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - daysAgo)
  return date.getTime()
}

const startOfHour = () => {
  const date = new Date()
  date.setMinutes(0, 0, 0)
  return date.getTime()
}

export const queryFor = (range: Range): UsageQuery => {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (range === '24h') return { since: startOfHour() - 23 * 3_600_000, bucket: 'hour', zone }
  return { since: startOfDay(Number(range.slice(0, -1)) - 1), bucket: 'day', zone }
}

export const rangeTitle: Record<Range, string> = { '24h': 'Last 24 hours', '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days' }

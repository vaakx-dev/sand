import type { UsageBucket } from '@sand/usage/contract'
import type { UsageRange } from '@sand/kit'

const monthName = () => new Date().toLocaleDateString('en', { month: 'long' })

export const rangeLabel = (range: UsageRange) =>
  range === 'month' ? monthName() : ({ '24h': '24h', '7d': '7 days', '30d': '30 days', '90d': '90 days' } as const)[range]

const pad = (value: number) => String(value).padStart(2, '0')

const keyOf = (date: Date, bucket: UsageBucket) => {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return bucket === 'day' ? day : `${day} ${pad(date.getHours())}`
}

export const hourKey = (at: number) => keyOf(new Date(at), 'hour')

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

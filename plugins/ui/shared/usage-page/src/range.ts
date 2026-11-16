import { keyOf, type UsageBucket } from '@sand/usage/contract'
import type { PageRange } from './prefs'

export const rangeLabel = (range: PageRange) => ({ '7d': '7 days', '30d': '30 days', '90d': '90 days' } as const)[range]

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

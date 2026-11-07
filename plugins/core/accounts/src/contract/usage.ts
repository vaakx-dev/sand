import type { Billing } from './models'
import type { PlanApi } from './plans'

export interface Usage {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  cacheWriteLong?: number
}

export interface UsageRecord {
  id: string
  model?: string
  source?: string
  account?: string
  provider?: string
  billing?: Billing
  plan?: string
  pc?: string
  pcName?: string
  usage: Usage
}

export interface CacheLifetimes {
  short: number
  long: number
}

const minute = 60_000

export const cacheLifetimes: Record<PlanApi, CacheLifetimes> = {
  anthropic: { short: 5 * minute, long: 60 * minute },
  openai: { short: 30 * minute, long: 12 * 60 * minute },
}

export const writtenTtl = ({ cacheWrite, cacheWriteLong = 0 }: Usage, { short, long }: CacheLifetimes) => {
  if (cacheWrite > cacheWriteLong) return short
  return cacheWriteLong ? long : undefined
}

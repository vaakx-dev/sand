import type { UsageRange } from '@sand/kit'
import type { UsageSummary } from '@sand/usage/contract'
import { isSummary } from '../data/valid'

export interface Cached {
  at: number
  summary: UsageSummary
}

const keyOf = (pc: string, range: UsageRange) => `sand.usage.summary.${pc}.${range}`

export const readCache = (pc: string, range: UsageRange): Cached | undefined => {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(keyOf(pc, range)) ?? 'null')
    if (!saved || typeof saved !== 'object' || !('at' in saved) || !('summary' in saved)) return undefined
    const { at, summary } = saved
    return typeof at === 'number' && isSummary(summary) ? { at, summary } : undefined
  } catch {
    return undefined
  }
}

export const writeCache = (pc: string, range: UsageRange, cached: Cached) => {
  try {
    localStorage.setItem(keyOf(pc, range), JSON.stringify(cached))
  } catch {}
}

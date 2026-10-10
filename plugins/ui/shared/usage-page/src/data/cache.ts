import type { UsageRange } from '@sand/kit'
import type { UsageSummary } from '@sand/usage/contract'
import { isSummary } from './valid'

export interface Cached {
  at: number
  summary: UsageSummary
}

const keyOf = (pc: string, range: UsageRange) => `sand.usage.summary.${pc}.${range}`

export const readCache = (pc: string, range: UsageRange): Cached | undefined => {
  try {
    const saved = localStorage.getItem(keyOf(pc, range))
    const value: unknown = saved && JSON.parse(saved)
    if (!value || typeof value !== 'object') return undefined
    const { at, summary } = value as Partial<Cached>
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

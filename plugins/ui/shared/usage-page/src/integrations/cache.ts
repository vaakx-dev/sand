import type { UsageSummary } from '@sand/usage/contract'
import { isSummary } from '../data/valid'

export interface Cached {
  at: number
  summary: UsageSummary
}

const keyOf = (pc: string, view: string) => `sand.usage.summary.${pc}.${view}`

export const readCache = (pc: string, view: string): Cached | undefined => {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(keyOf(pc, view)) ?? 'null')
    if (!saved || typeof saved !== 'object' || !('at' in saved) || !('summary' in saved)) return undefined
    const { at, summary } = saved
    return typeof at === 'number' && isSummary(summary) ? { at, summary } : undefined
  } catch {
    return undefined
  }
}

export const writeCache = (pc: string, view: string, cached: Cached) => {
  try {
    localStorage.setItem(keyOf(pc, view), JSON.stringify(cached))
  } catch {}
}

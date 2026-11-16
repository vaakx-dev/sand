import { addTotals, emptyTotals } from '@sand/usage/contract'
import type { Merged, PcSummary } from '../types'
import { mergeModels, mergePeriods, mergeUnpriced } from './groups'

const latest = (parts: PcSummary[]) => parts.reduce((best, part) => (part.summary.until > best.summary.until ? part : best)).summary

export const mergeSummaries = (parts: PcSummary[]): Merged => {
  const total = emptyTotals()
  for (const { summary } of parts) addTotals(total, summary.total)
  const { since, until, bucket } = latest(parts)
  return {
    since,
    until,
    bucket,
    total,
    models: mergeModels(parts),
    periods: mergePeriods(parts),
    unpriced: mergeUnpriced(parts),
  }
}

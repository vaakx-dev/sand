import { emptyTotals } from '@sand/usage/records'
import { addTotals } from '../totals'
import type { Merged, PcSummary } from '../types'
import { mergeAccounts } from './accounts'
import { mergeModels, mergePeriods, mergeUnpriced } from './groups'
import { mergeProjects, pcUsage } from './places'

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
    accounts: mergeAccounts(parts),
    models: mergeModels(parts),
    periods: mergePeriods(parts),
    projects: mergeProjects(parts),
    pcs: pcUsage(parts),
    unpriced: mergeUnpriced(parts),
  }
}

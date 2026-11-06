import type { PullSummary } from '@sand/github/contract'
import type { Phase } from '../book/record'

export const phaseOf = (summary: PullSummary): Phase => {
  if (summary.state === 'merged' || summary.state === 'closed') return summary.state
  return summary.checks.state === 'fail' ? 'failing' : 'open'
}

import type { PrSummary } from '@sand/github/contract'
import { plural } from '@sand/kit'

export type PillTone = 'running' | 'failing' | 'ready' | 'merged' | 'quiet'

export interface PillState {
  label: string
  tone: PillTone
}

export const pillState = (pr: PrSummary): PillState => {
  if (pr.state === 'merged') return { label: 'Merged', tone: 'merged' }
  if (pr.state === 'closed') return { label: 'Closed', tone: 'quiet' }
  if (pr.mergeState === 'DIRTY') return { label: 'Conflicts', tone: 'running' }
  if (pr.checks.failed) return { label: `${pr.checks.failed} failing`, tone: 'failing' }
  if (pr.checks.pending) return { label: 'Checks running', tone: 'running' }
  if (pr.unresolved) return { label: plural(pr.unresolved, 'comment'), tone: 'running' }
  if (pr.draft) return { label: 'Draft', tone: 'quiet' }
  if (pr.mergeState === 'BEHIND') return { label: `Behind ${pr.base}`, tone: 'running' }
  if (pr.review === 'REVIEW_REQUIRED' || pr.review === 'CHANGES_REQUESTED') return { label: 'Needs review', tone: 'quiet' }
  return { label: 'Ready', tone: 'ready' }
}

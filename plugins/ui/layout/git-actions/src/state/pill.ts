import type { PrSummary } from '@sand/github/contract'

export type PillTone = 'running' | 'failing' | 'ready' | 'merged' | 'quiet'

export interface PillState {
  label: string
  tone: PillTone
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

export const pillState = (pr: PrSummary): PillState => {
  if (pr.state === 'merged') return { label: 'merged', tone: 'merged' }
  if (pr.state === 'closed') return { label: 'closed', tone: 'quiet' }
  if (pr.mergeState === 'DIRTY') return { label: 'conflicts', tone: 'running' }
  if (pr.checks.failed) return { label: `${pr.checks.failed} failing`, tone: 'failing' }
  if (pr.checks.pending) return { label: 'checks running', tone: 'running' }
  if (pr.unresolved) return { label: plural(pr.unresolved, 'comment'), tone: 'running' }
  if (pr.draft) return { label: 'draft', tone: 'quiet' }
  if (pr.mergeState === 'BEHIND') return { label: `behind ${pr.base}`, tone: 'running' }
  if (pr.review === 'REVIEW_REQUIRED' || pr.review === 'CHANGES_REQUESTED') return { label: 'needs review', tone: 'quiet' }
  return { label: 'ready', tone: 'ready' }
}

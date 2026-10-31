import type { PullState, PullSummary } from '@sand/github/contract'
import type { PullLink } from '@sand/pull-links/contract'
import type { IconName, Tone } from '@sand/ui-kit/contract'

export interface PullLook {
  tone: Tone
  icon: IconName
  label: string
  short?: string
}

const states: Record<PullState, PullLook> = {
  open: { tone: 'success', icon: 'pull-request', label: 'Open' },
  draft: { tone: 'neutral', icon: 'pr-draft', label: 'Draft', short: 'draft' },
  merged: { tone: 'accent', icon: 'merge', label: 'Merged', short: 'merged' },
  closed: { tone: 'neutral', icon: 'pr-closed', label: 'Closed', short: 'closed' },
}

const unknown: PullLook = { tone: 'neutral', icon: 'pull-request', label: 'Pull request' }

export const stateLook = (summary: PullSummary | undefined) => (summary ? states[summary.state] : unknown)

export const isLive = (summary: PullSummary | undefined) => summary?.state === 'open' || summary?.state === 'draft'

const failing = (failed: number) => (failed > 0 ? `${failed} failing` : 'checks failing')

export const attentionLook = (summary: PullSummary | undefined): PullLook => {
  const base = stateLook(summary)
  if (!summary || !isLive(summary)) return base
  if (summary.merge === 'conflict') return { tone: 'danger', icon: 'alert', label: base.label, short: 'conflicts' }
  if (summary.checks.state === 'fail') return { tone: 'danger', icon: 'x', label: base.label, short: failing(summary.checks.failed) }
  if (summary.review === 'changes') return { tone: 'warning', icon: 'message', label: base.label, short: 'changes requested' }
  if (summary.checks.state === 'pending') return { tone: 'warning', icon: 'clock', label: base.label, short: 'checks running' }
  return base
}

export const needsAttention = (summary: PullSummary | undefined) =>
  isLive(summary) && (summary?.merge === 'conflict' || summary?.checks.state === 'fail')

export const pullName = (summary: Pick<PullSummary, 'number'>) => `#${summary.number}`

export const pullTitle = (link: PullLink) => {
  const look = attentionLook(link.summary)
  return [pullName(link), link.summary?.title, look.short ?? look.label].filter(Boolean).join(' · ')
}

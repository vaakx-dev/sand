import type { PullSummary } from '@sand/github/contract'
import { isLivePull, pullName, pullStateLook, type PullStateLook } from '@sand/github/look'
import type { PullLink } from '@sand/pull-links/contract'

const unknown: PullStateLook = { tone: 'neutral', icon: 'pull-request', label: 'Pull request' }

export const stateLook = (summary: PullSummary | undefined) => (summary ? pullStateLook(summary.state) : unknown)

const isLive = (summary: PullSummary | undefined) => Boolean(summary && isLivePull(summary.state))

const failing = (failed: number) => (failed > 0 ? `${failed} failing` : 'checks failing')

export const attentionLook = (summary: PullSummary | undefined): PullStateLook => {
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

export const pullTitle = (link: PullLink) => {
  const look = attentionLook(link.summary)
  return [pullName(link), link.summary?.title, look.short ?? look.label].filter(Boolean).join(' · ')
}

import type { PullSummary } from '@sand/github/contract'

const activeMs = 2 * 60_000
const quietMs = 5 * 60_000
const quietAfterMs = 30 * 60_000

export const retryMs = quietMs

export const isEnded = (summary: Pick<PullSummary, 'state'>) => summary.state === 'merged' || summary.state === 'closed'

export const endedAt = (summary: PullSummary) => (isEnded(summary) ? summary.ended : undefined)

export const nextDue = (summary: PullSummary, now: number) => {
  if (isEnded(summary)) return Number.POSITIVE_INFINITY
  return now + (now - summary.updated > quietAfterMs ? quietMs : activeMs)
}

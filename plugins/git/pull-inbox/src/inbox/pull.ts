import type { InboxPull } from '../contract'
import { groupRank, reasonFor } from '../reason/reason'
import type { Found } from '../search/page'

export const inboxPull = ({ summary, labels, methods, mine, requested }: Found): InboxPull => {
  const reviewRequested = !mine && requested
  return {
    ...summary,
    labels,
    methods,
    mine,
    reviewRequested,
    reason: reasonFor(summary, mine, reviewRequested),
  }
}

export const byGroup = (pulls: InboxPull[]) =>
  pulls.filter(pull => pull.reason.group !== 'done').sort((a, b) => groupRank(a.reason.group) - groupRank(b.reason.group) || b.updated - a.updated)

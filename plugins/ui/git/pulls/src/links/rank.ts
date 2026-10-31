import type { PullRef } from '@sand/github/contract'
import type { PullLink } from '@sand/pull-links/contract'

const rank = ({ summary }: PullLink) => {
  if (!summary) return 3
  if (summary.state === 'merged') return 5
  if (summary.state === 'closed') return 6
  if (summary.merge === 'conflict') return 0
  if (summary.checks.state === 'fail') return 1
  if (summary.review === 'changes') return 2
  return summary.state === 'open' ? 3 : 4
}

export const byAttention = (links: PullLink[]) => [...links].sort((a, b) => rank(a) - rank(b) || b.linked - a.linked)

export const primaryOf = (links: PullLink[]): PullLink | undefined => byAttention(links)[0]

export const pullKey = ({ repo, number }: PullRef) => `${repo}#${number}`

export const samePull = (a: PullRef, b: PullRef) => a.repo === b.repo && a.number === b.number

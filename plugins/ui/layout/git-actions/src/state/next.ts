import type { GitStatus } from '@sand/git/contract'
import type { PrSummary } from '@sand/github/contract'

export type Pr = PrSummary | null | undefined

export type Step = 'commit' | 'pull' | 'push' | 'pr' | 'babysit' | 'merge' | 'none'

const mergeable = new Set(['CLEAN', 'HAS_HOOKS', 'UNSTABLE'])

export const baseOf = (git: GitStatus | undefined, pr?: Pr) => pr?.base ?? git?.base ?? 'main'

const openPr = (pr: Pr) => (pr?.state === 'open' ? pr : undefined)

export const mergeBlock = (pr: Pr): string | undefined => {
  if (!pr) return 'no PR yet'
  if (pr.state === 'merged') return 'already merged'
  if (pr.state === 'closed') return 'PR is closed'
  if (pr.draft) return 'still a draft'
  if (pr.mergeState === 'DIRTY') return 'has conflicts'
  if (pr.checks.failed) return 'checks failing'
  if (pr.checks.pending) return 'checks running'
  if (pr.unresolved) return 'unresolved comments'
  if (pr.mergeState === 'BEHIND') return `behind ${pr.base}`
  if (pr.review === 'REVIEW_REQUIRED' || pr.review === 'CHANGES_REQUESTED') return 'needs review'
  if (!mergeable.has(pr.mergeState)) return 'blocked'
  return undefined
}

export const prBlock = (git: GitStatus | undefined, pr: Pr): string | undefined => {
  const open = openPr(pr)
  if (open) return `#${open.number} is open`
  if (!git) return 'not a git folder'
  if (git.branch === 'HEAD') return 'no branch checked out'
  if (git.branch === git.base) return `on ${git.base}`
  if (pr && !git.ahead) return 'no new commits'
  if (!git.ahead && !git.upstream) return 'no new commits'
  return undefined
}

export const pushBlock = (git: GitStatus | undefined): string | undefined => {
  if (!git) return 'not a git folder'
  if (git.behind) return 'pull first'
  if (!git.ahead) return 'nothing to push'
  return undefined
}

const needsCare = (pr: PrSummary) => pr.checks.failed > 0 || pr.unresolved > 0 || pr.mergeState === 'DIRTY'

export const nextStep = (git: GitStatus | undefined, pr: Pr): Step => {
  if (!git) return 'none'
  if (git.changed) return 'commit'
  if (git.behind) return 'pull'
  const open = openPr(pr)
  if (git.ahead && (open || pr === undefined || git.branch === git.base)) return 'push'
  if (pr !== undefined && !prBlock(git, pr)) return 'pr'
  if (open && needsCare(open)) return 'babysit'
  if (open && !mergeBlock(open)) return 'merge'
  return 'none'
}

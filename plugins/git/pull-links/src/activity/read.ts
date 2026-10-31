import type { GitHub, PullRef, PullState } from '@sand/github/contract'
import { activityQuery, type RawActivity, type RawComment, type RawContext, type RawPull, type RawReview, type RawThread } from './query'
import type { CheckResult, ItemKind, OpenThread, PullActivity, PullItem } from './types'

const failed = new Set(['FAILURE', 'TIMED_OUT', 'CANCELLED', 'ACTION_REQUIRED', 'STARTUP_FAILURE', 'ERROR'])

const checkOf = (raw: RawContext): CheckResult => {
  if (raw.__typename === 'CheckRun') {
    if (raw.status !== 'COMPLETED' || !raw.conclusion) return { name: raw.name, state: 'pending' }
    if (raw.conclusion === 'SUCCESS') return { name: raw.name, state: 'pass' }
    return { name: raw.name, state: failed.has(raw.conclusion) ? 'fail' : 'skip' }
  }
  if (raw.state === 'SUCCESS') return { name: raw.context, state: 'pass' }
  return { name: raw.context, state: failed.has(raw.state) ? 'fail' : 'pending' }
}

const stateOf = (pull: RawPull): PullState => {
  if (pull.state === 'MERGED') return 'merged'
  if (pull.state === 'CLOSED') return 'closed'
  return pull.isDraft ? 'draft' : 'open'
}

const itemOf = (raw: RawComment, kind: ItemKind, at = raw.createdAt): PullItem => ({
  kind,
  author: raw.author?.login ?? 'ghost',
  body: raw.body,
  at: Date.parse(at),
})

const reviewKinds: Record<string, ItemKind> = { APPROVED: 'approved', CHANGES_REQUESTED: 'changes', COMMENTED: 'reviewed' }

const reviewItem = (raw: RawReview): PullItem[] => {
  const kind = reviewKinds[raw.state]
  if (!kind || (kind === 'reviewed' && !raw.body.trim())) return []
  return [itemOf(raw, kind, raw.submittedAt ?? raw.createdAt)]
}

const threadItems = (thread: RawThread): PullItem[] =>
  thread.comments.nodes.map(raw => ({ ...itemOf(raw, 'comment'), path: thread.path, ...(thread.line !== null && { line: thread.line }) }))

const openThread = (thread: RawThread): OpenThread => ({
  path: thread.path,
  ...(thread.line !== null && { line: thread.line }),
  comments: thread.comments.nodes.map(raw => itemOf(raw, 'comment')),
})

const activityOf = (viewer: string, pull: RawPull): PullActivity => ({
  viewer,
  state: stateOf(pull),
  head: pull.headRefOid,
  headBranch: pull.headRefName,
  fork: pull.isCrossRepository,
  ...(pull.headRepositoryOwner && { headOwner: pull.headRepositoryOwner.login }),
  conflict: pull.mergeable === 'CONFLICTING',
  checks: (pull.commits.nodes[0]?.commit.statusCheckRollup?.contexts.nodes ?? []).map(checkOf),
  items: [
    ...pull.reviews.nodes.flatMap(reviewItem),
    ...pull.comments.nodes.map(raw => itemOf(raw, 'comment')),
    ...pull.reviewThreads.nodes.flatMap(threadItems),
  ].sort((a, b) => a.at - b.at),
  open: pull.reviewThreads.nodes.filter(thread => !thread.isResolved).map(openThread),
})

export const readActivity = async (github: GitHub, { repo, number }: PullRef): Promise<PullActivity> => {
  const [owner, name] = repo.split('/')
  if (!owner || !name) throw new Error(`"${repo}" isn't an owner/name repository.`)
  const raw = await github.graphql<RawActivity>(activityQuery, { owner, name, number })
  const pull = raw.repository?.pullRequest
  if (!pull) throw new Error(`Couldn't find pull request #${number} in ${repo}.`)
  return activityOf(raw.viewer.login, pull)
}

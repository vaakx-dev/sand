import type { MergeMethod, MergeState, PullState, ReviewState } from '../../contract'
import type { PullNode } from './query'

export const pullState = (node: PullNode): PullState => {
  if (node.state === 'MERGED') return 'merged'
  if (node.state === 'CLOSED') return 'closed'
  return node.isDraft ? 'draft' : 'open'
}

export const reviewState = (node: PullNode): ReviewState => {
  if (node.reviewDecision === 'APPROVED') return 'approved'
  if (node.reviewDecision === 'CHANGES_REQUESTED') return 'changes'
  if (node.reviewDecision === 'REVIEW_REQUIRED') return 'required'
  return 'none'
}

const byStatus: Record<string, MergeState> = {
  DIRTY: 'conflict',
  BEHIND: 'behind',
  BLOCKED: 'blocked',
  DRAFT: 'blocked',
  CLEAN: 'clean',
  HAS_HOOKS: 'clean',
  UNSTABLE: 'clean',
}

export const mergeState = (node: PullNode): MergeState => {
  if (node.mergeable === 'CONFLICTING') return 'conflict'
  return byStatus[node.mergeStateStatus] ?? 'unknown'
}

export const mergeMethod = (node: PullNode): MergeMethod | undefined => node.autoMergeRequest?.mergeMethod.toLowerCase() as MergeMethod | undefined

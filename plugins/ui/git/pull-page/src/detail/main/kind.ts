import type { PullDetail } from '@sand/pull-detail/contract'

export type MainKind = 'delete-branch' | 'reopen' | 'ready' | 'conflict' | 'auto-on' | 'behind' | 'auto' | 'merge' | 'blocked' | 'none'

export const blockReason = (pull: PullDetail): string | undefined => {
  if (pull.checks.state === 'fail') return 'Checks are failing'
  if (pull.review === 'changes') return 'Changes were requested'
  if (pull.review === 'required') return 'Needs an approving review'
  if (pull.merge === 'blocked') return 'Blocked by branch rules'
  if (pull.merge === 'unknown') return 'GitHub is still checking'
  return undefined
}

const openKind = (pull: PullDetail): MainKind => {
  if (pull.merge === 'conflict') return 'conflict'
  if (pull.autoMerge) return 'auto-on'
  if (pull.merge === 'behind') return 'behind'
  if (!pull.canMerge) return 'none'
  if (pull.checks.state === 'pending') return 'auto'
  return blockReason(pull) ? 'blocked' : 'merge'
}

export const mainKind = (pull: PullDetail): MainKind => {
  if (pull.state === 'merged') return pull.headDeleted ? 'none' : 'delete-branch'
  if (pull.state === 'closed') return pull.canEdit ? 'reopen' : 'none'
  if (pull.state === 'draft') return pull.canEdit ? 'ready' : 'none'
  return openKind(pull)
}

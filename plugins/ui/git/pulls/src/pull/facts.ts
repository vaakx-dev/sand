import type { PullSummary, ReviewState } from '@sand/github/contract'
import { plural } from '@sand/util'

const reviews: Record<ReviewState, string> = {
  approved: 'Approved',
  changes: 'Changes requested',
  required: 'Review required',
  none: 'No reviews yet',
}

export const reviewText = (summary: PullSummary) => {
  const comments = summary.unresolved > 0 ? plural(summary.unresolved, 'open comment') : ''
  if (summary.review === 'none' && comments) return comments
  return comments ? `${reviews[summary.review]} · ${comments}` : reviews[summary.review]
}

export const mergeBlock = (summary: PullSummary): string | undefined => {
  if (summary.merge === 'conflict') return `Conflicts with ${summary.base}`
  if (summary.checks.state === 'fail') return 'Blocked by checks'
  if (summary.checks.state === 'pending') return 'Checks are running'
  if (summary.review === 'changes') return 'Changes requested'
  if (summary.review === 'required') return 'Needs an approving review'
  if (summary.merge === 'behind') return `Behind ${summary.base}`
  if (summary.merge === 'blocked') return 'Blocked by branch rules'
  if (summary.merge === 'unknown') return 'GitHub is still checking'
  return undefined
}

export const mergeText = (summary: PullSummary) => {
  if (summary.state === 'merged') return 'Merged'
  if (summary.state === 'closed') return 'Closed without merging'
  if (summary.state === 'draft') return 'Draft'
  if (summary.autoMerge) return `Merges by ${summary.autoMerge} when ready`
  return mergeBlock(summary) ?? 'Ready to merge'
}

export const canAutoMerge = (summary: PullSummary) =>
  summary.state === 'open' && !summary.autoMerge && summary.merge !== 'conflict' && summary.checks.state === 'pending'

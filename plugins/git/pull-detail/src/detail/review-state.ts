import type { ReviewerState } from '../contract'

const states: Record<string, ReviewerState> = {
  APPROVED: 'approved',
  CHANGES_REQUESTED: 'changes',
  COMMENTED: 'commented',
  PENDING: 'pending',
  DISMISSED: 'dismissed',
}

export const reviewerState = (state: string): ReviewerState | undefined => states[state]

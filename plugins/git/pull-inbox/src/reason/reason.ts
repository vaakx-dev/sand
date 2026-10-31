import type { PullSummary } from '@sand/github/contract'
import { plural } from '@sand/util'
import type { InboxGroup, InboxReason, ReasonTone } from '../contract'

const reason = (group: InboxGroup, text: string, tone: ReasonTone): InboxReason => ({ group, text, tone })

const yours = (pull: PullSummary): InboxReason => {
  if (pull.state === 'draft') return reason('waiting', 'Draft', 'neutral')
  if (pull.checks.state === 'fail') return reason('turn', `${plural(pull.checks.failed, 'check')} failing`, 'danger')
  if (pull.merge === 'conflict') return reason('turn', 'Merge conflicts', 'danger')
  if (pull.review === 'changes') return reason('turn', 'Changes requested', 'warning')
  if (pull.unresolved > 0) return reason('turn', plural(pull.unresolved, 'unresolved comment'), 'warning')
  if (pull.checks.state === 'pending') return reason('waiting', pull.autoMerge ? 'Merges when checks pass' : 'Checks running', 'neutral')
  if (pull.review === 'required') return reason('waiting', 'Waiting on review', 'neutral')
  if (pull.merge === 'behind') return reason('turn', 'Branch is out of date', 'warning')
  if (pull.merge === 'clean') return reason('ready', pull.review === 'approved' ? 'Approved' : 'Ready to merge', 'success')
  if (pull.merge === 'blocked') return reason('waiting', 'Blocked by branch rules', 'neutral')
  return reason('waiting', 'Checking if it can merge', 'neutral')
}

const theirs = (pull: PullSummary, requested: boolean): InboxReason => {
  if (pull.state === 'draft') return reason('waiting', 'Draft', 'neutral')
  if (requested) return reason('turn', 'Review requested', 'accent')
  if (pull.review === 'approved') return reason('waiting', 'Approved', 'neutral')
  if (pull.review === 'changes') return reason('waiting', 'Changes requested', 'neutral')
  if (pull.checks.state === 'fail') return reason('waiting', 'Checks failing', 'neutral')
  return reason('waiting', 'Open', 'neutral')
}

export const reasonFor = (pull: PullSummary, mine: boolean, requested: boolean): InboxReason => {
  if (pull.state === 'merged') return reason('done', 'Merged', 'accent')
  if (pull.state === 'closed') return reason('done', 'Closed', 'neutral')
  return mine ? yours(pull) : theirs(pull, requested)
}

const ranks: Record<InboxGroup, number> = { turn: 0, ready: 1, waiting: 2, done: 3 }

export const groupRank = (group: InboxGroup) => ranks[group]

export const needsYou = (group: InboxGroup) => group === 'turn' || group === 'ready'

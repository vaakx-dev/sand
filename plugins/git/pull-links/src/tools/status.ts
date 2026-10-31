import type { MergeState, PullSummary, ReviewState } from '@sand/github/contract'
import { oneLine, plural, shortSha } from '@sand/util'
import type { PullActivity } from '../activity/types'
import type { StoredLink } from '../book/record'
import { quotedItem, untrustedNote } from '../watch/note'

const reviews: Record<ReviewState, string> = { approved: 'approved', changes: 'changes requested', required: 'review required', none: 'no review needed' }

const merges: Record<MergeState, string> = {
  clean: 'ready to merge',
  conflict: 'conflicts with the base branch',
  behind: 'behind the base branch',
  blocked: 'blocked',
  unknown: 'GitHub is still working it out',
}

const mostThreads = 10
const mostComments = 3

const names = (activity: PullActivity, state: 'fail' | 'pending') => [...new Set(activity.checks.filter(check => check.state === state).map(check => oneLine(check.name, 80)))]

const checksLines = (summary: PullSummary, activity: PullActivity) => {
  const { passed, failed, pending } = summary.checks
  const lines = [`Checks: ${summary.checks.state === 'none' ? 'none' : `${failed} failed, ${passed} passed, ${pending} running`}`]
  const failing = names(activity, 'fail')
  const running = names(activity, 'pending')
  if (failing.length) lines.push(`Failing: ${failing.join(', ')}`)
  if (running.length) lines.push(`Running: ${running.join(', ')}`)
  return lines
}

const conversations = (activity: PullActivity) => {
  if (!activity.open.length) return []
  const shown = activity.open.slice(0, mostThreads).map(thread =>
    thread.comments
      .slice(-mostComments)
      .map(comment => quotedItem({ ...comment, path: thread.path, ...(thread.line !== undefined && { line: thread.line }) }))
      .join('\n'),
  )
  const more = activity.open.length - shown.length
  return [`Open conversations:`, untrustedNote, ...shown, ...(more > 0 ? [`…and ${plural(more, 'more conversation')}.`] : [])]
}

export const statusText = (link: StoredLink, summary: PullSummary, activity: PullActivity) =>
  [
    `#${summary.number} in ${summary.repo}: ${oneLine(summary.title, 120)}`,
    summary.url,
    `State: ${summary.state} · ${summary.base} ← ${summary.head} · head ${shortSha(activity.head)}`,
    ...checksLines(summary, activity),
    `Review: ${reviews[summary.review]} · ${plural(summary.unresolved, 'unresolved conversation')}`,
    `Merge: ${merges[summary.merge]}`,
    `Watching: ${link.watching ? 'yes' : 'no'}`,
    ...conversations(activity),
  ].join('\n')

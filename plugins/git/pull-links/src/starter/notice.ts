import { notificationText } from '@sand/chats/contract'
import type { PullSummary } from '@sand/github/contract'
import type { Notice } from '@sand/orchestrator/contract'
import type { Phase } from '../book/record'

export type Told = Exclude<Phase, 'open'>

const statuses: Record<Told, string> = { merged: 'merged', closed: 'closed', failing: 'checks failed' }

const resultOf = (summary: PullSummary, phase: Told) => {
  const where = `${summary.repo}#${summary.number} ${summary.url}`
  if (phase !== 'failing') return where
  const failed = summary.checkList.filter(check => check.state === 'fail').map(check => check.name)
  return failed.length ? `${where}\nFailed checks: ${failed.join(', ')}` : where
}

export const noticeOf = (thread: string, summary: PullSummary, phase: Told): Notice => ({
  text: notificationText({
    from: 'thread',
    id: thread,
    kind: 'pull request',
    label: `#${summary.number} ${summary.title}`,
    status: statuses[phase],
    at: summary.ended ?? summary.updated,
    result: resultOf(summary, phase),
  }),
  clientRequestId: `${thread}@${summary.repo}#${summary.number}:${phase}:${summary.head}`,
})

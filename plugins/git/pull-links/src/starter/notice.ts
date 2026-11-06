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
  text: [
    '<task-notification>',
    `<thread>${thread}</thread>`,
    '<kind>pull request</kind>',
    `<label>#${summary.number} ${summary.title}</label>`,
    `<status>${statuses[phase]}</status>`,
    '<result>',
    resultOf(summary, phase),
    '</result>',
    '</task-notification>',
  ].join('\n'),
  clientRequestId: `${thread}@${summary.repo}#${summary.number}:${phase}:${summary.head}`,
})

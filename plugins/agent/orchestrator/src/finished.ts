import type { Session } from '@sand/chats/contract'
import { backgroundJobs } from '@sand/jobs/contract'
import { turnEnd, type TurnInfo, type TurnResult, type TurnStatus } from '@sand/turns-contract/contract'
import type { OrchestratorContext } from './context'
import type { Owners } from './owners'
import type { Starters } from './starters'
import type { Waits } from './waits'

const limit = 30_000

const outcomes: Partial<Record<TurnStatus, string>> = { completed: 'done', interrupted: 'cancelled' }

const clip = (text: string) => (text.length > limit ? `${text.slice(0, limit)}\n… ${text.length - limit} characters truncated` : text)

const noticeOf = (session: Session, result: TurnResult, info: TurnInfo) =>
  [
    '<task-notification>',
    `<thread>${session.id}</thread>`,
    '<kind>thread</kind>',
    `<label>${session.title || 'Untitled thread'}</label>`,
    `<status>${outcomes[info.status] ?? 'failed'}</status>`,
    '<result>',
    clip(result.error ?? result.text),
    '</result>',
    '</task-notification>',
  ].join('\n')

export const reportFinished = (ctx: OrchestratorContext, starters: Starters, waits: Waits, owners: Owners) => {
  const busy = (session: Session) =>
    ctx.turns.pending(session).some(item => !item.held) ||
    ctx.get(backgroundJobs)?.list(session.id).some(job => job.kind === 'agent' && job.status === 'running')

  ctx.on(turnEnd, (session, result, info) => {
    const starter = starters.of(session.id)
    if (!starter || info.origin === 'user' || waits.has(starter, session.id) || busy(session)) return
    owners.notify(session.id, { text: noticeOf(session, result, info), clientRequestId: `${session.id}@${info.id}` }).catch(error => ctx.report(error))
  })
}

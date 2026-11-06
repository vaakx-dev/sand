import type { Session } from '@sand/chats/contract'
import { backgroundJobs } from '@sand/jobs/contract'
import type { TurnInfo, TurnResult, TurnStatus } from '@sand/turns-contract/contract'
import type { BridgeContext } from './context'
import type { Starts } from './starts'
import type { Waits } from './waits'

const limit = 30_000

const outcomes: Partial<Record<TurnStatus, string>> = { completed: 'done', interrupted: 'cancelled' }

const clip = (text: string) => (text.length > limit ? `${text.slice(0, limit)}\n… ${text.length - limit} characters truncated` : text)

const notice = (session: Session, result: TurnResult, info: TurnInfo) =>
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

export const reportFinished = (ctx: BridgeContext, starts: Starts, waits: Waits) => (session: Session, result: TurnResult, info: TurnInfo) => {
  const bot = starts.botOf(session.id)
  if (!bot || !ctx.bots.get(bot) || info.origin === 'user' || waits.has(bot, session.id)) return
  if (ctx.turns.pending(session).some(item => !item.held)) return
  if (ctx.get(backgroundJobs)?.list(session.id).some(job => job.kind === 'agent' && job.status === 'running')) return
  ctx.botTurns
    .send(bot, { prompt: notice(session, result, info), origin: 'job', clientRequestId: `${session.id}@${info.id}` })
    .catch(error => ctx.report(error))
}

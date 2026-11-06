import type { Session } from '@sand/chats/contract'
import { backgroundJobs } from '@sand/jobs/contract'
import { turnEnd, type TurnInfo, type TurnResult } from '@sand/turns-contract/contract'
import type { OrchestratorContext } from './context'
import { reportOf } from './contract'
import type { Owners } from './owners'
import type { Starters } from './starters'
import type { Waits } from './waits'

const noticeOf = (session: Session, result: TurnResult, info: TurnInfo) =>
  reportOf({ from: { owner: 'thread', id: session.id }, label: session.title || 'Untitled thread', status: info.status, result: result.error ?? result.text })

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

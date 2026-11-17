import type { Session } from '@sand/chats/contract'
import type { ConversationRef } from '@sand/engine/contract'
import { turnEnd, type TurnInfo, type TurnResult } from '@sand/turns-contract/contract'
import { carrying } from '@sand/usage-resume/contract'
import type { OrchestratorContext } from './context'
import { reportOf } from './contract'
import type { Owners } from './owners'
import type { Starters } from './starters'
import { threadStatus } from './state'
import type { Waits } from './waits'

const noticeOf = (session: Session, result: TurnResult, info: TurnInfo) =>
  reportOf({ from: { owner: 'thread', id: session.id }, label: session.title || 'Untitled thread', status: info.status, at: info.ended ?? Date.now(), result: result.error ?? result.text })

export const runningSubagents = (ctx: OrchestratorContext, session: Session) =>
  ctx.sessions.children(session.id).some(child => threadStatus(ctx, ctx.sessions.require(child.id)) === 'running')

export const reportFinished = (ctx: OrchestratorContext, starters: Starters, waits: Waits, owners: Owners, stopped: Set<string>) => {
  const busy = (session: Session) => ctx.turns.pending(session).some(item => !item.held) || runningSubagents(ctx, session)

  const archived = ({ id }: ConversationRef) => Boolean(ctx.sessions.open(id)?.archived)

  const carriedOn = (result: TurnResult, info: TurnInfo) => !!ctx.get(carrying)?.continues(result, info.selection)

  ctx.on(turnEnd, (session, result, info) => {
    const starter = starters.of(session)
    const quiet = stopped.delete(session.id)
    if (!starter || carriedOn(result, info) || archived(starter) || waits.has(starter, session.id) || busy(session)) return
    const text = noticeOf(session, result, info)
    const told = quiet ? owners.record(starter, text) : owners.deliver(starter, { text, clientRequestId: `${session.id}@${info.id}` })
    told.catch(error => ctx.report(error))
  })
}

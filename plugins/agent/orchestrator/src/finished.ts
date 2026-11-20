import type { Session } from '@sand/chats/contract'
import type { ConversationRef } from '@sand/engine/contract'
import { server } from '@sand/server/contract'
import { turnEnd, type TurnInfo, type TurnResult } from '@sand/turns-contract/contract'
import { carrying } from '@sand/usage-resume/contract'
import type { OrchestratorContext } from './context'
import { type Finish, reportOf, threadReported } from './contract'
import type { Outbox } from './outbox'
import type { Owners } from './owners'
import type { Starters } from './starters'
import { threadStatus } from './state'
import type { Waits } from './waits'

interface Reporting {
  starters: Starters
  waits: Waits
  owners: Owners
  stopped: Set<string>
  answered: Set<string>
  outbox: Outbox
}

const noticeOf = (session: Session, result: TurnResult, info: TurnInfo) =>
  reportOf({ from: { owner: 'thread', id: session.id }, label: session.title || 'Untitled thread', status: info.status, at: info.ended ?? Date.now(), result: result.error ?? result.text })

export const runningSubagents = (ctx: OrchestratorContext, session: Session) =>
  ctx.sessions.children(session.id).some(child => threadStatus(ctx, ctx.sessions.require(child.id)) === 'running')

export const reportFinished = (ctx: OrchestratorContext, { starters, waits, owners, stopped, answered, outbox }: Reporting) => {
  const busy = (session: Session) => ctx.turns.pending(session).some(item => !item.held) || runningSubagents(ctx, session)

  const archived = ({ id }: ConversationRef) => Boolean(ctx.sessions.open(id)?.archived)

  const carriedOn = (result: TurnResult, info: TurnInfo) => !!ctx.get(carrying)?.continues(result, info.selection)

  const tell = async ({ to, thread, text, clientRequestId, asks }: Finish) => {
    if (asks) return void (await owners.deliver(to, { text, clientRequestId }))
    const quiet = stopped.delete(thread)
    if (answered.delete(clientRequestId) || archived(to) || waits.has(to, thread)) return
    await (quiet ? owners.record(to, text) : owners.deliver(to, { text, clientRequestId }))
  }

  const tellAway = (pc: string, finish: Finish) => {
    outbox.put(pc, finish)
    ctx.get(server)?.broadcast(threadReported, finish.thread)
  }

  ctx.on(turnEnd, (session, result, info) => {
    const starter = starters.of(session)
    if (!starter || carriedOn(result, info) || busy(session)) return void stopped.delete(session.id)
    const finish = { to: { owner: starter.owner, id: starter.id }, thread: session.id, text: noticeOf(session, result, info), clientRequestId: `${session.id}@${info.id}` }
    if (starter.pc) return tellAway(starter.pc, finish)
    tell(finish).catch(error => ctx.report(error))
  })

  return tell
}

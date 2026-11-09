import type { Session } from '@sand/chats/contract'
import type { ConversationRef } from '@sand/engine/contract'
import { type SendResult, turnEnd, type TurnInfo, type TurnResult } from '@sand/turns-contract/contract'
import type { OrchestratorContext } from './context'
import { type Notice, reportOf } from './contract'
import { findThread } from './find'
import type { Owners } from './owners'
import type { Starters } from './starters'
import type { Waits } from './waits'

const stopWait = 10_000

interface Posted {
  session: Session
  sent: Promise<SendResult | undefined>
}

const noticeOf = (session: Session, result: TurnResult, info: TurnInfo) =>
  reportOf({ from: { owner: 'thread', id: session.id }, label: session.title || 'Untitled thread', status: info.status, at: info.ended ?? Date.now(), result: result.error ?? result.text })

const same = (a: ConversationRef | undefined, b: ConversationRef) => a?.owner === b.owner && a.id === b.id

export const reportFinished = (ctx: OrchestratorContext, starters: Starters, waits: Waits, owners: Owners) => {
  const quiet = new Set<string>()
  const posted = new Map<string, Posted>()

  const running = (id: string) => {
    const session = ctx.sessions.open(id)
    return Boolean(session && ctx.turns.current(session))
  }

  const runningAgents = (session: Session) => ctx.sessions.children(session.id).filter(child => child.kind === 'agent' && running(child.id))

  const busy = (session: Session, interrupted: boolean) => ctx.turns.pending(session).some(item => !item.held) || (!interrupted && runningAgents(session).length > 0)

  const post = async (thread: string, starter: ConversationRef, notice: Notice) => {
    const session = starter.owner === 'thread' ? ctx.sessions.open(starter.id) : undefined
    if (!session) return owners.deliver(starter, notice)
    const sent = ctx.turns.send(session, { prompt: notice.text, origin: 'job', clientRequestId: notice.clientRequestId })
    posted.set(thread, { session, sent: sent.catch(() => undefined) })
    return sent
  }

  const stop = async (thread: string, by?: ConversationRef) => {
    const session = findThread(ctx, thread)
    const turn = ctx.turns.current(session)
    if (!turn) return false
    if (by && same(starters.of(thread), by)) quiet.add(thread)
    if (!ctx.turns.interrupt(session, turn.id)) {
      quiet.delete(thread)
      return false
    }
    await ctx.turns.wait(turn.id, 'end', AbortSignal.timeout(stopWait))
    return true
  }

  ctx.on(turnEnd, (session, result, info) => {
    for (const [thread, notice] of posted) if (notice.session.id === session.id) posted.delete(thread)
    const interrupted = result.stopReason === 'interrupted'
    if (interrupted) for (const agent of runningAgents(session)) stop(agent.id, { owner: 'thread', id: session.id }).catch(error => ctx.report(error))
    if (quiet.delete(session.id)) return
    const starter = starters.of(session.id)
    if (!starter || info.origin === 'user' || waits.has(starter, session.id) || busy(session, interrupted)) return
    post(session.id, starter, { text: noticeOf(session, result, info), clientRequestId: `${session.id}@${info.id}` }).catch(error => ctx.report(error))
  })

  ctx.effect(() => () => posted.clear())

  return {
    stop,
    withdraw(thread: string, by: ConversationRef) {
      const notice = posted.get(thread)
      if (!notice || !same({ owner: 'thread', id: notice.session.id }, by)) return
      posted.delete(thread)
      void notice.sent.then(result => {
        if (result && 'pending' in result) ctx.turns.withdraw(notice.session, result.pending)
      })
    },
  }
}

export type Reports = ReturnType<typeof reportFinished>

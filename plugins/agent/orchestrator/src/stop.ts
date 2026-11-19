import type { Session } from '@sand/chats/contract'
import { backgroundJobs } from '@sand/jobs/contract'
import { conversationStop } from '@sand/engine/contract'
import type { OrchestratorContext } from './context'
import type { SendAway } from './away'
import type { Starters } from './starters'

const STOP_WAIT_MS = 10_000

export const stopTurn = async (ctx: OrchestratorContext, session: Session) => {
  const turn = ctx.turns.current(session)
  if (!turn || !ctx.turns.interrupt(session, turn.id)) return false
  await ctx.turns.wait(turn.id, 'end', AbortSignal.timeout(STOP_WAIT_MS))
  return true
}

const stopJobs = (ctx: OrchestratorContext, session: Session) => ctx.get(backgroundJobs)?.stopAll(session.id) ?? false

export const stopThread = async (ctx: OrchestratorContext, session: Session) => {
  const turnStopped = await stopTurn(ctx, session)
  const jobsStopped = stopJobs(ctx, session)
  return turnStopped || jobsStopped
}

export const stopSubagents = (ctx: OrchestratorContext, starters: Starters, sendAway: SendAway, stopped: Set<string>) => {
  const stopElsewhere = async (thread: string, pc: string) => {
    stopped.add(thread)
    if (!(await sendAway({ thread, pc, errand: 'stop' }))) stopped.delete(thread)
  }

  ctx.on(conversationStop, parent => {
    for (const child of ctx.sessions.children(parent.id)) if (ctx.turns.interrupt(ctx.sessions.require(child.id))) stopped.add(child.id)
    for (const { thread, pc } of starters.elsewhere(parent.id)) stopElsewhere(thread, pc).catch(error => ctx.report(error))
  })
}

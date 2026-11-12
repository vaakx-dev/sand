import type { Session } from '@sand/chats/contract'
import { backgroundJobs } from '@sand/jobs/contract'
import type { OrchestratorContext } from './context'

const STOP_WAIT_MS = 10_000

const stopTurn = async (ctx: OrchestratorContext, session: Session) => {
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

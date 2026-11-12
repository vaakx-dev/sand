import type { Session } from '@sand/chats/contract'
import type { OrchestratorContext } from './context'

const STOP_WAIT_MS = 10_000

export const stopThread = async (ctx: OrchestratorContext, session: Session) => {
  const turn = ctx.turns.current(session)
  if (!turn || !ctx.turns.interrupt(session, turn.id)) return false
  await ctx.turns.wait(turn.id, 'end', AbortSignal.timeout(STOP_WAIT_MS))
  return true
}

import type { Session } from '@sand/chats/contract'
import { conversationStop } from '@sand/engine/contract'
import type { OrchestratorContext } from './context'

const STOP_WAIT_MS = 10_000

export const stopThread = async (ctx: OrchestratorContext, session: Session) => {
  const turn = ctx.turns.current(session)
  ctx.turns.interrupt(session)
  if (!turn) return false
  await ctx.turns.wait(turn.id, 'end', AbortSignal.timeout(STOP_WAIT_MS))
  return true
}

export const stopSubagents = (ctx: OrchestratorContext) => {
  const stopped = new Set<string>()
  ctx.on(conversationStop, parent => {
    for (const child of ctx.sessions.children(parent.id)) if (ctx.turns.interrupt(ctx.sessions.require(child.id))) stopped.add(child.id)
  })
  return stopped
}

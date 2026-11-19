import { sessionRemove } from '@sand/chats/contract'
import type { SendAway } from './away'
import type { OrchestratorContext } from './context'
import { failure } from './contract'
import type { Starters } from './starters'
import { stopThread } from './stop'

export const removeSubagents = (ctx: OrchestratorContext, starters: Starters, sendAway: SendAway) =>
  ctx.on(sessionRemove, removed => {
    for (const { thread, pc } of starters.elsewhere(removed)) {
      starters.remove(thread)
      sendAway({ thread, pc, errand: 'remove' }).catch(error => ctx.report(error))
    }
    starters.remove(removed)
  })

export const removeStarted = async (ctx: OrchestratorContext, starters: Starters, thread: string, pc: string) => {
  const session = ctx.sessions.open(thread)
  if (!session) return false
  if (starters.starterOf(thread)?.pc !== pc) throw failure('denied', `Thread ${thread} wasn't started from that PC`)
  await stopThread(ctx, session)
  await ctx.sessions.remove(thread)
  return true
}

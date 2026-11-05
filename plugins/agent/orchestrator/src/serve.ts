import type { Session } from '@sand/chats/contract'
import { server, userWrote } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { OrchestratorContext } from './context'
import { threadList, threadRead, threadSend, threadStart, threadStop, threadWait, waitLimit } from './contract'
import { findThread } from './find'
import { listThreads } from './list'
import { readThread } from './read'
import type { Start } from './start'
import { waitThread } from './state'

const stopWait = 10_000

export const serveThreads = (ctx: OrchestratorContext, start: Start) => {
  const thread = (id: string) => findThread(ctx, id)

  const stop = async (session: Session) => {
    const turn = ctx.turns.current(session)
    if (!turn || !ctx.turns.interrupt(session, turn.id)) return false
    await ctx.turns.wait(turn.id, 'end', AbortSignal.timeout(stopWait))
    return true
  }

  ctx.watch(server, found => {
    if (!found) return
    return joinDisposers(
      found.handle(threadStart, input => start(input)),
      found.handle(threadSend, async ({ session: id, ...input }) => {
        const session = thread(id)
        ctx.emit(userWrote, session)
        return { ...(await ctx.turns.send(session, input)), thread: id }
      }),
      found.handle(threadWait, ({ session: id, until = 'attention', timeoutMs = waitLimit }) =>
        waitThread(ctx, thread(id), until, AbortSignal.timeout(timeoutMs)),
      ),
      found.handle(threadRead, ({ session: id, ...options }) => readThread(thread(id), options)),
      found.handle(threadList, filter => listThreads(ctx, filter)),
      found.handle(threadStop, ({ session: id }) => stop(thread(id))),
    )
  })
}

import type { Session } from '@sand/chats/contract'
import type { Caller, InputOf, Request } from '@sand/host-hub/contract'
import { type Server, server, userWrote } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { OrchestratorContext } from './context'
import { answerGrace, threadList, threadRead, threadSend, threadStart, threadStop, threadWait, waitLimit } from './contract'
import { findThread } from './find'
import { listThreads } from './list'
import type { Pcs } from './pcs'
import { readThread } from './read'
import type { Start } from './start'
import { waitThread } from './state'

const stopWait = 10_000

const forwarded = (caller: Caller) => caller.kind === 'pc'

export const serveThreads = (ctx: OrchestratorContext, start: Start, pcs: Pcs) => {
  const thread = (id: string) => findThread(ctx, id)

  const stop = async (session: Session) => {
    const turn = ctx.turns.current(session)
    if (!turn || !ctx.turns.interrupt(session, turn.id)) return false
    await ctx.turns.wait(turn.id, 'end', AbortSignal.timeout(stopWait))
    return true
  }

  const send = async ({ session: id, ...input }: InputOf<typeof threadSend>) => {
    const session = thread(id)
    ctx.emit(userWrote, session)
    return { ...(await ctx.turns.send(session, input)), thread: id }
  }

  const onOwner = <I extends { session: string }, O>(
    found: Server,
    request: Request<I, O>,
    here: (input: I) => O | Promise<O>,
    timeout?: (input: I) => number,
  ) =>
    found.handle(request, async (input, caller) => {
      const pc = forwarded(caller) ? undefined : await pcs.ownerOf(input.session)
      return pc ? pcs.call(pc, request, input, timeout?.(input)) : here(input)
    })

  ctx.watch(server, found => {
    if (!found) return
    return joinDisposers(
      found.handle(threadStart, ({ pc, ...input }, caller) => (pc && !forwarded(caller) ? pcs.start(pc, input) : start(input))),
      found.handle(threadList, (filter, caller) => (forwarded(caller) ? listThreads(ctx, filter) : pcs.list(filter))),
      onOwner(found, threadSend, send),
      onOwner(
        found,
        threadWait,
        ({ session: id, until = 'attention', timeoutMs = waitLimit }) => waitThread(ctx, thread(id), until, AbortSignal.timeout(timeoutMs)),
        ({ timeoutMs = waitLimit }) => timeoutMs + answerGrace,
      ),
      onOwner(found, threadRead, ({ session: id, ...options }) => readThread(thread(id), options)),
      onOwner(found, threadStop, ({ session: id }) => stop(thread(id))),
    )
  })
}

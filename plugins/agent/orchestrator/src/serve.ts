import type { Session } from '@sand/chats/contract'
import type { Actor, Caller, InputOf, Request } from '@sand/host-hub/contract'
import { type Server, server, userWrote } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { adoptBy, checkSend, checkWait } from './acting'
import type { OrchestratorContext } from './context'
import {
  answerGrace,
  failure,
  type Orchestrator,
  originOf,
  threadList,
  threadRead,
  threadSend,
  threadStart,
  threadStop,
  threadUpdate,
  threadWait,
  waitLimit,
} from './contract'
import { findThread } from './find'
import { listThreads } from './list'
import type { Pcs } from './pcs'
import { readThread } from './read'
import type { Start } from './start'
import { updateThread } from './update'

const stopWait = 10_000

const forwarded = (caller: Caller) => caller.kind === 'pc'

export const serveThreads = (ctx: OrchestratorContext, threads: Orchestrator, start: Start, pcs: Pcs) => {
  const thread = (id: string) => findThread(ctx, id)

  const stop = async (session: Session) => {
    const turn = ctx.turns.current(session)
    if (!turn || !ctx.turns.interrupt(session, turn.id)) return false
    await ctx.turns.wait(turn.id, 'end', AbortSignal.timeout(stopWait))
    return true
  }

  const begin = ({ pc, ...input }: InputOf<typeof threadStart>, caller: Caller) => {
    if (pc && !forwarded(caller)) return pcs.start(pc, input)
    const { actor } = caller
    return start({ ...input, origin: originOf(actor, input.origin), ...(actor && { from: actor }) }, adoptBy(ctx, actor))
  }

  const send = ({ session: id, ...input }: InputOf<typeof threadSend>, { actor }: Caller) => {
    checkSend(ctx, actor, id)
    if (!actor) ctx.emit(userWrote, thread(id))
    return threads.send(id, { ...input, origin: originOf(actor, input.origin), ...(actor && { from: actor }) })
  }

  const startedBy = (actor: Actor | undefined) => {
    if (!actor) throw failure('invalid_request', "Only sand's own threads and bots start threads of their own")
    const started = threads.started(actor.owner)
    return new Set(Object.keys(started).filter(id => started[id] === actor.id))
  }

  const list = ({ mine, bot, ...filter }: InputOf<typeof threadList>, caller: Caller) => {
    if (mine) return listThreads(ctx, { ...filter, ids: startedBy(caller.actor) })
    if (bot) return listThreads(ctx, { ...filter, ids: startedBy({ owner: 'bot', id: bot }) })
    return forwarded(caller) ? listThreads(ctx, filter) : pcs.list(filter)
  }

  const onOwner = <I extends { session: string }, O>(
    found: Server,
    request: Request<I, O>,
    here: (input: I, caller: Caller) => O | Promise<O>,
    timeout?: (input: I) => number,
  ) =>
    found.handle(request, async (input, caller) => {
      const pc = forwarded(caller) ? undefined : await pcs.ownerOf(input.session)
      return pc ? pcs.call(pc, request, input, timeout?.(input)) : here(input, caller)
    })

  ctx.watch(server, found => {
    if (!found) return
    return joinDisposers(
      found.handle(threadStart, begin),
      found.handle(threadList, list),
      onOwner(found, threadSend, send),
      onOwner(
        found,
        threadWait,
        ({ session: id, until = 'attention', timeoutMs = waitLimit }, { actor }) => {
          checkWait(actor, id)
          return threads.wait(id, until, AbortSignal.timeout(timeoutMs), actor)
        },
        ({ timeoutMs = waitLimit }) => timeoutMs + answerGrace,
      ),
      onOwner(found, threadRead, ({ session: id, ...options }) => readThread(thread(id), options)),
      onOwner(found, threadStop, ({ session: id }) => stop(thread(id))),
      onOwner(found, threadUpdate, input => updateThread(ctx, input)),
    )
  })
}

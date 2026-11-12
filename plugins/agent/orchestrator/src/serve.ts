import type { ConversationRef } from '@sand/engine/contract'
import type { Actor, Caller, InputOf, Request } from '@sand/host-hub/contract'
import { type Server, server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { adoptBy, checkSend, checkWait } from './acting'
import type { OrchestratorContext } from './context'
import {
  answerGrace,
  failure,
  historyRead,
  itemRead,
  type Orchestrator,
  originOf,
  threadList,
  threadPending,
  threadSend,
  threadStart,
  threadStop,
  threadUpdate,
  threadWait,
  waitLimit,
} from './contract'
import { findThread } from './find'
import { type ListFilter, listThreads } from './list'
import type { Pcs } from './pcs'
import type { Start } from './start'
import { changePending } from './pending'
import { stopThread } from './stop'
import { updateThread } from './update'

const forwarded = (caller: Caller) => caller.kind === 'pc'

export const serveThreads = (ctx: OrchestratorContext, threads: Orchestrator, start: Start, pcs: Pcs) => {
  const thread = (id: string) => findThread(ctx, id)

  const begin = ({ pc, ...input }: InputOf<typeof threadStart>, caller: Caller) => {
    if (pc && !forwarded(caller)) return pcs.start(pc, input)
    const { actor } = caller
    return start({ ...input, origin: originOf(actor, input.origin), ...(actor && { from: actor }) }, adoptBy(ctx, actor))
  }

  const send = ({ session: id, ...input }: InputOf<typeof threadSend>, { actor }: Caller) => {
    checkSend(ctx, actor, id)
    return threads.send(id, { ...input, origin: originOf(actor, input.origin), ...(actor && { from: actor }) })
  }

  const startedBy = (actor: Actor | undefined) => {
    if (!actor) throw failure('invalid_request', "Only sand's own threads and bots start subagents")
    const started = threads.started(actor.owner)
    return new Set(Object.keys(started).filter(id => started[id] === actor.id))
  }

  const subagentsOf = (starter: Actor | undefined, filter: ListFilter) => listThreads(ctx, { ...filter, subagents: true, ids: startedBy(starter) })

  const list = ({ mine, bot, thread, ...filter }: InputOf<typeof threadList>, caller: Caller) => {
    if (mine) return subagentsOf(caller.actor, filter)
    if (bot) return subagentsOf({ owner: 'bot', id: bot }, filter)
    if (thread) return subagentsOf({ owner: 'thread', id: thread }, filter)
    return forwarded(caller) ? listThreads(ctx, filter) : pcs.list(filter)
  }

  const conversationOf = (session: string | undefined, bot: string | undefined, actor: Actor | undefined): ConversationRef => {
    if (session !== undefined && bot !== undefined) throw failure('invalid_request', 'Give either a thread or a bot')
    if (session !== undefined) return { owner: 'thread', id: session }
    if (bot !== undefined) return { owner: 'bot', id: bot }
    if (!actor) throw failure('invalid_request', 'Name the thread or bot')
    return { owner: actor.owner, id: actor.id }
  }

  const onOwner = <I extends { session?: string }, O>(
    found: Server,
    request: Request<I, O>,
    here: (input: I, caller: Caller) => O | Promise<O>,
    timeout?: (input: I) => number,
  ) =>
    found.handle(request, async (input, caller) => {
      const pc = forwarded(caller) || !input.session ? undefined : await pcs.ownerOf(input.session)
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
      onOwner(found, historyRead, ({ session, bot, ...reading }, { actor }) => threads.read(conversationOf(session, bot, actor), reading)),
      onOwner(found, itemRead, ({ session, bot, item, offset }, { actor }) => threads.item(conversationOf(session, bot, actor), item, offset)),
      onOwner(found, threadPending, ({ session: id, pending, action }) => changePending(ctx, thread(id), pending, action)),
      onOwner(found, threadStop, ({ session: id }) => stopThread(ctx, thread(id))),
      onOwner(found, threadUpdate, input => updateThread(ctx, input)),
    )
  })
}

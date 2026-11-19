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
  threadReport,
  threadSend,
  threadStart,
  threadStop,
  threadUpdate,
  threadWait,
  waitLimit,
} from './contract'
import { findThread } from './find'
import type { Finish } from './finished'
import { type ListFilter, listThreads } from './list'
import type { Pcs } from './pcs'
import type { Start } from './start'
import { changePending } from './pending'
import { stopTurn } from './stop'
import { updateThread } from './update'
import type { Waits } from './waits'

interface Served {
  threads: Orchestrator
  start: Start
  pcs: Pcs
  waits: Waits
  tell: (finish: Finish) => Promise<void>
}

const forwarded = (caller: Caller) => caller.kind === 'pc'

export const serveThreads = (ctx: OrchestratorContext, { threads, start, pcs, waits, tell }: Served) => {
  const thread = (id: string) => findThread(ctx, id)

  const startFor = ({ from, ...input }: InputOf<typeof threadStart>, { device }: Caller) =>
    start({ ...input, ...(from && { from: { ...from, pc: device } }) })

  const begin = ({ pc, ...input }: InputOf<typeof threadStart>, caller: Caller) => {
    if (forwarded(caller)) return startFor(input, caller)
    if (input.from || input.subagent) throw failure('invalid_request', 'Only another PC starts a subagent through thread.start')
    if (pc) return pcs.start(pcs.find(pc), input)
    const { actor } = caller
    return start({ ...input, origin: originOf(actor, input.origin), ...(actor && { from: actor }) }, adoptBy(ctx, actor))
  }

  const wait = async ({ session: id, until = 'attention', timeoutMs = waitLimit }: InputOf<typeof threadWait>, caller: Caller) => {
    checkWait(caller.actor, id)
    const pc = forwarded(caller) ? undefined : await pcs.ownerOf(id)
    const input = { session: id, until, timeoutMs }
    const waiting = () => (pc ? pcs.call(pc, threadWait, input, timeoutMs + answerGrace) : threads.wait(id, until, AbortSignal.timeout(timeoutMs)))
    return caller.actor ? waits.during(caller.actor, id, waiting) : waiting()
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
  ) =>
    found.handle(request, async (input, caller) => {
      const pc = forwarded(caller) || !input.session ? undefined : await pcs.ownerOf(input.session)
      return pc ? pcs.call(pc, request, input) : here(input, caller)
    })

  ctx.watch(server, found => {
    if (!found) return
    return joinDisposers(
      found.handle(threadStart, begin),
      found.handle(threadList, list),
      onOwner(found, threadSend, send),
      found.handle(threadWait, wait),
      found.handle(threadReport, tell),
      onOwner(found, historyRead, ({ session, bot, ...reading }, { actor }) => threads.read(conversationOf(session, bot, actor), reading)),
      onOwner(found, itemRead, ({ session, bot, item, offset }, { actor }) => threads.item(conversationOf(session, bot, actor), item, offset)),
      onOwner(found, threadPending, ({ session: id, pending, action }) => changePending(ctx, thread(id), pending, action)),
      onOwner(found, threadStop, ({ session: id }) => stopTurn(ctx, thread(id))),
      onOwner(found, threadUpdate, input => updateThread(ctx, input)),
    )
  })
}

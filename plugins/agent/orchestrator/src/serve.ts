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
  threadReports,
  threadSend,
  threadStart,
  threadStop,
  threadUpdate,
  threadWait,
  waitLimit,
} from './contract'
import { findThread } from './find'
import { listThreads } from './list'
import type { Outbox } from './outbox'
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
  outbox: Outbox
}

const forwarded = (caller: Caller) => caller.kind === 'pc'

export const serveThreads = (ctx: OrchestratorContext, { threads, start, pcs, waits, outbox }: Served) => {
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

  const send = async ({ session: id, prompt, ...input }: InputOf<typeof threadSend>, caller: Caller) => {
    const { actor } = caller
    const pc = forwarded(caller) ? undefined : await pcs.ownerOf(id)
    const message = { ...input, prompt: threads.sign(prompt, actor), origin: originOf(actor, input.origin) }
    if (pc) return pcs.call(pc, threadSend, { session: id, ...message })
    checkSend(ctx, actor, id)
    return threads.send(id, message)
  }

  const starterAsked = ({ mine, bot, thread }: InputOf<typeof threadList>, actor: Actor | undefined): Actor | undefined => {
    if (mine && !actor) throw failure('invalid_request', "Only sand's own threads and bots start subagents")
    if (mine) return actor
    if (bot) return { owner: 'bot', id: bot }
    if (thread) return { owner: 'thread', id: thread }
    return undefined
  }

  const startedBy = ({ owner, id }: Actor) => {
    const started = threads.started(owner)
    return new Set(Object.keys(started).filter(subagent => started[subagent] === id))
  }

  const askedOf = ({ owner, id }: Actor) => (owner === 'bot' ? { bot: id } : { thread: id })

  const list = (input: InputOf<typeof threadList>, caller: Caller) => {
    const { mine, bot, thread, ...filter } = input
    const starter = starterAsked(input, caller.actor)
    const here = listThreads(ctx, starter ? { ...filter, subagents: true, ids: startedBy(starter) } : filter)
    if (forwarded(caller)) return here
    return pcs.besides(here, starter ? { ...filter, ...askedOf(starter) } : filter)
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
      found.handle(threadSend, send),
      found.handle(threadWait, wait),
      found.handle(threadReports, ({ delivered }, { device }) => outbox.take(device, delivered)),
      onOwner(found, historyRead, ({ session, bot, ...reading }, { actor }) => threads.read(conversationOf(session, bot, actor), reading)),
      onOwner(found, itemRead, ({ session, bot, item, offset }, { actor }) => threads.item(conversationOf(session, bot, actor), item, offset)),
      onOwner(found, threadPending, ({ session: id, pending, action }) => changePending(ctx, thread(id), pending, action)),
      onOwner(found, threadStop, ({ session: id }) => stopTurn(ctx, thread(id))),
      onOwner(found, threadUpdate, input => updateThread(ctx, input)),
    )
  })
}

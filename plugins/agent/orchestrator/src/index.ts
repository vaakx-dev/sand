import { readHistory, readItem, sessionRemove } from '@sand/chats/contract'
import type { ConversationRef, Owner } from '@sand/engine/contract'
import type { WaitUntil } from '@sand/turns-contract/contract'
import { definePlugin } from 'drydock'
import { inject } from './context'
import { type Orchestrator, orchestrator, settled } from './contract'
import { findThread } from './find'
import { reportFinished } from './finished'
import { createOwners } from './owners'
import { createPcs } from './pcs'
import { openReceipts } from './receipts'
import { schema } from './schema'
import { serveThreads } from './serve'
import { createStart } from './start'
import { openStarters } from './starters'
import { waitThread } from './state'
import { createWaits } from './waits'

export default definePlugin({
  name: 'orchestrator',
  description:
    "Threads for the sand thread command, outside agents and sand's own agents: start, message, wait for, read, list and stop threads on this PC or your other PCs, built on turns. A thread, subagents included, tells whoever started it when it finishes",
  inject,
  apply(ctx) {
    ctx.ledger.migrate('orchestrator', schema)
    const starters = openStarters(ctx.ledger, ctx.sessions)
    const waits = createWaits()
    const owners = createOwners(ctx, starters)
    const reports = reportFinished(ctx, starters, waits, owners)
    const start = createStart(ctx, openReceipts(ctx.ledger), starters, owners)
    const named = ({ owner, id }: ConversationRef): Partial<Record<Owner, string>> => ({ [owner]: id })
    const waiterOf = (by: ConversationRef) => (by.owner === 'thread' ? ctx.sessions.open(by.id) : undefined)
    const waitBy = async (thread: string, until: WaitUntil, signal: AbortSignal, by: ConversationRef) => {
      const state = await waits.during(by, thread, () => waitThread(ctx, findThread(ctx, thread), until, signal, waiterOf(by)))
      if (settled(state.status, until)) reports.withdraw(thread, by)
      return state
    }
    const threads: Orchestrator = {
      start: input => start(input),
      send: async (thread, { prompt, from, ...input }) => ({ ...(await ctx.turns.send(findThread(ctx, thread), { ...input, prompt: owners.sign(prompt, from) })), thread }),
      wait: (thread, until, signal, by) => (by ? waitBy(thread, until, signal, by) : waitThread(ctx, findThread(ctx, thread), until, signal)),
      read: (conversation, reading) => ({ ...named(conversation), ...readHistory(owners.history(conversation), reading) }),
      item: (conversation, item, offset) => ({ ...named(conversation), ...readItem(owners.history(conversation), item, offset) }),
      stop: reports.stop,
      starterOf: starters.of,
      started: starters.owned,
      notify: owners.notify,
      deliver: owners.deliver,
      owner: owners.register,
    }
    ctx.provide(orchestrator, threads)
    ctx.on(sessionRemove, starters.remove)
    serveThreads(ctx, threads, start, createPcs(ctx))
  },
})

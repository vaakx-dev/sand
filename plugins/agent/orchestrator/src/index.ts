import { readHistory, readItem, sessionRemove } from '@sand/chats/contract'
import type { ConversationRef, Owner } from '@sand/engine/contract'
import type { WaitUntil } from '@sand/turns-contract/contract'
import { definePlugin } from 'drydock'
import { inject } from './context'
import { type Orchestrator, orchestrator } from './contract'
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
    "Threads for the sand thread command, outside agents and sand's own agents: start, message, wait for, read, list and stop threads on this PC or your other PCs, built on turns. A thread tells whoever started it when it finishes",
  inject,
  apply(ctx) {
    ctx.ledger.migrate('orchestrator', schema)
    const starters = openStarters(ctx.ledger)
    const waits = createWaits()
    const owners = createOwners(ctx, starters)
    const start = createStart(ctx, openReceipts(ctx.ledger), starters, owners)
    const wait = (thread: string, until: WaitUntil, signal: AbortSignal) => waitThread(ctx, findThread(ctx, thread), until, signal)
    const named = ({ owner, id }: ConversationRef): Partial<Record<Owner, string>> => ({ [owner]: id })
    const threads: Orchestrator = {
      start: input => start(input),
      send: async (thread, { prompt, from, ...input }) => ({ ...(await ctx.turns.send(findThread(ctx, thread), { ...input, prompt: owners.sign(prompt, from) })), thread }),
      wait: (thread, until, signal, by) => (by ? waits.during(by, thread, () => wait(thread, until, signal)) : wait(thread, until, signal)),
      read: (conversation, reading) => ({ ...named(conversation), ...readHistory(owners.history(conversation), reading) }),
      item: (conversation, item, offset) => ({ ...named(conversation), ...readItem(owners.history(conversation), item, offset) }),
      starterOf: starters.of,
      started: starters.owned,
      notify: owners.notify,
      deliver: owners.deliver,
      sign: owners.sign,
      owner: owners.register,
    }
    ctx.provide(orchestrator, threads)
    ctx.on(sessionRemove, starters.remove)
    reportFinished(ctx, starters, waits, owners)
    serveThreads(ctx, threads, start, createPcs(ctx))
  },
})

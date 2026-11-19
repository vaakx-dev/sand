import { readHistory, readItem, sessionRemove } from '@sand/chats/contract'
import type { ConversationRef, Owner } from '@sand/engine/contract'
import { definePlugin } from 'drydock'
import { inject } from './context'
import { type Orchestrator, orchestrator } from './contract'
import { findThread } from './find'
import { reportFinished } from './finished'
import { createOwners } from './owners'
import { createPcs } from './pcs'
import { openReceipts } from './receipts'
import { schema } from './schema'
import { archiveSubagents } from './archive'
import { stopSubagents } from './stop'
import { serveThreads } from './serve'
import { serveSettle } from './settle'
import { z } from 'zod'
import { createStart } from './start'
import { openStarters } from './starters'
import { waitThread } from './state'
import { createWaits } from './waits'

export default definePlugin({
  name: 'orchestrator',
  description:
    "Threads for the sand thread command, outside agents and sand's own agents: start threads and subagents, message, wait for, read, list and stop them on this PC or your other PCs, built on turns. A subagent tells whoever started it when it finishes and is archived with its parent; a thread stands on its own. settle_days sets when threads and bots the user hasn't talked to settle",
  inject,
  config: z.object({ settle_days: z.number().int().min(1).max(365).default(3) }).default({ settle_days: 3 }),
  apply(ctx, { settle_days }) {
    ctx.ledger.migrate('orchestrator', schema)
    const starters = openStarters(ctx.ledger)
    const waits = createWaits()
    const owners = createOwners(ctx)
    const pcs = createPcs(ctx)
    const start = createStart(ctx, openReceipts(ctx.ledger), starters, owners, pcs)
    const named = ({ owner, id }: ConversationRef): Partial<Record<Owner, string>> => ({ [owner]: id })
    const threads: Orchestrator = {
      start,
      send: async (thread, { prompt, from, ...input }) => ({ ...(await ctx.turns.send(findThread(ctx, thread), { ...input, prompt: owners.sign(prompt, from) })), thread }),
      wait: (thread, until, signal) => waitThread(ctx, findThread(ctx, thread), until, signal),
      read: (conversation, reading) => ({ ...named(conversation), ...readHistory(owners.history(conversation), reading) }),
      item: (conversation, item, offset) => ({ ...named(conversation), ...readItem(owners.history(conversation), item, offset) }),
      starterOf: starters.starterOf,
      started: starters.owned,
      sign: owners.sign,
      owner: owners.register,
    }
    ctx.provide(orchestrator, threads)
    ctx.on(sessionRemove, starters.remove)
    const tell = reportFinished(ctx, starters, waits, owners, stopSubagents(ctx, starters, pcs), pcs)
    archiveSubagents(ctx)
    serveThreads(ctx, { threads, start, pcs, waits, tell })
    serveSettle(ctx, settle_days)
  },
})

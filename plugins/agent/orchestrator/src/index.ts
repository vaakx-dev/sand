import { readHistory, readItem } from '@sand/chats/contract'
import type { ConversationRef, Owner } from '@sand/engine/contract'
import { definePlugin } from 'drydock'
import { inject } from './context'
import { type Orchestrator, orchestrator, waitThread as waitAway } from './contract'
import { findThread } from './find'
import { reportFinished } from './finished'
import { createOwners } from './owners'
import { createPcs } from './pcs'
import { openReceipts } from './receipts'
import { schema } from './schema'
import { archiveSubagents } from './archive'
import { createAway } from './away'
import { openOutbox } from './outbox'
import { removeStarted, removeSubagents } from './remove'
import { stopSubagents } from './stop'
import { serveThreads } from './serve'
import { serveSettle } from './settle'
import { z } from 'zod'
import { createStart } from './start'
import { openStarters } from './starters'
import { waitThread } from './state'
import { createWaits } from './waits'
import { createWorking } from './working'

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
    const answered = new Set<string>()
    const owners = createOwners(ctx)
    const pcs = createPcs(ctx)
    const start = createStart(ctx, openReceipts(ctx.ledger), starters, owners, pcs)
    const named = ({ owner, id }: ConversationRef): Partial<Record<Owner, string>> => ({ [owner]: id })
    const threads: Orchestrator = {
      start,
      send: async (thread, { prompt, from, ...input }) => ({ ...(await ctx.turns.send(findThread(ctx, thread), { ...input, prompt: owners.sign(prompt, from) })), thread }),
      wait: (thread, until, signal) => waitThread(ctx, findThread(ctx, thread), until, signal),
      answer: (thread, by, signal) =>
        waits.during(by, thread, async () => {
          const pc = await pcs.ownerOf(thread)
          if (!pc) return waitThread(ctx, findThread(ctx, thread), 'end', signal)
          const state = await waitAway((request, input, options) => pcs.call(pc, request, input, options?.timeout), thread, 'end', Infinity, signal)
          if (state.turn && !signal.aborted) answered.add(`${thread}@${state.turn}`)
          return state
        }),
      read: (conversation, reading) => ({ ...named(conversation), ...readHistory(owners.history(conversation), reading) }),
      item: (conversation, item, offset) => ({ ...named(conversation), ...readItem(owners.history(conversation), item, offset) }),
      starterOf: starters.starterOf,
      elsewhere: starters.elsewhere,
      started: starters.owned,
      sign: owners.sign,
      owner: owners.register,
      working: createWorking(ctx, starters),
    }
    ctx.provide(orchestrator, threads)
    const outbox = openOutbox(ctx.ledger)
    const stopped = new Set<string>()
    const sendAway = createAway(ctx, pcs, reportFinished(ctx, { starters, waits, owners, stopped, answered, outbox }))
    stopSubagents(ctx, starters, sendAway, stopped)
    archiveSubagents(ctx, starters, sendAway)
    removeSubagents(ctx, starters, sendAway)
    serveThreads(ctx, { threads, start, pcs, waits, outbox, remove: (thread, pc) => removeStarted(ctx, starters, thread, pc) })
    serveSettle(ctx, settle_days)
  },
})

import { definePlugin } from 'drydock'
import { inject } from './context'
import { orchestrator } from './contract'
import { findThread } from './find'
import { createPcs } from './pcs'
import { readThread } from './read'
import { openReceipts } from './receipts'
import { serveThreads } from './serve'
import { createStart } from './start'
import { waitThread } from './state'
import { threadTools } from './tools'

export default definePlugin({
  name: 'orchestrator',
  description:
    "Threads for the sand thread command, outside agents and sand's own agents: start, message, wait for, read, list and stop threads on this PC or your other PCs, built on turns",
  inject,
  apply(ctx) {
    const start = createStart(ctx, openReceipts(ctx.ledger))
    ctx.provide(orchestrator, {
      start: input => start(input),
      wait: (thread, until, signal) => waitThread(ctx, findThread(ctx, thread), until, signal),
      read: (thread, options) => readThread(findThread(ctx, thread), options),
    })
    serveThreads(ctx, start, createPcs(ctx))
    threadTools(ctx, start)
  },
})

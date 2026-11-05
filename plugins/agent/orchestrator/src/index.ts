import { definePlugin } from 'drydock'
import { inject } from './context'
import { openReceipts } from './receipts'
import { serveThreads } from './serve'
import { createStart } from './start'

export default definePlugin({
  name: 'orchestrator',
  description: 'Threads for the sand thread command and outside agents: start, message, wait for, read, list and stop threads, built on turns',
  inject,
  apply(ctx) {
    serveThreads(ctx, createStart(ctx, openReceipts(ctx.ledger)))
  },
})

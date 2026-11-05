import { definePlugin } from 'drydock'
import { inject } from './context'
import { openReceipts } from './receipts'
import { serveThreads } from './serve'
import { createStart } from './start'
import { threadTools } from './tools'

export default definePlugin({
  name: 'orchestrator',
  description:
    "Threads for the sand thread command, outside agents and sand's own agents: start, message, wait for, read, list and stop threads, built on turns",
  inject,
  apply(ctx) {
    const start = createStart(ctx, openReceipts(ctx.ledger))
    serveThreads(ctx, start)
    threadTools(ctx, start)
  },
})

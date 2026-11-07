import { ledger } from '@sand/ledger/contract'
import { shellRunner } from '@sand/shell/contract'
import { definePlugin } from 'drydock'
import { z } from 'zod'
import { createBook } from './book'
import { watches } from './contract'
import { command } from './kinds/command'
import { page } from './kinds/page'
import { registerPushKinds } from './kinds/push'
import { openStore } from './store'
import { createWatches } from './watches'

export default definePlugin({
  name: 'watches',
  description: 'Keeps durable watches for other plugins, runs their cheap watchers with no model, and wakes the owner with a batch of changes only when something changed',
  inject: { ledger },
  config: z
    .object({
      debounce_ms: z.number().int().nonnegative().default(5_000),
      retry_ms: z.number().int().positive().default(60_000),
    })
    .prefault({}),
  apply(ctx, config) {
    const service = createWatches(ctx, createBook(ctx, openStore(ctx.ledger)), config)
    ctx.provide(watches, service)
    registerPushKinds(ctx, service)
    ctx.effect(() => service.kind(page))
    ctx.watch(shellRunner, runner => (runner ? service.kind(command(runner)) : undefined))
  },
})

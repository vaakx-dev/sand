import { definePlugin } from 'drydock'
import { z } from 'zod'
import { inject } from './context'
import { providerThreads } from './contract'
import { handoffCap } from './handoff/budget'
import { createThreads } from './prepare'
import { createHandoffStore } from './store/handoffs'
import { schema } from './store/schema'
import { createThreadStore } from './store/threads'

export default definePlugin({
  name: 'provider-threads',
  description: 'Keeps what each model of a conversation has seen, so a model keeps its cached prefix and a switch hands over only what fits',
  inject,
  config: z.object({
    handoff_tokens: z
      .number()
      .int()
      .default(handoffCap.default)
      .transform(tokens => Math.min(handoffCap.max, Math.max(handoffCap.min, tokens))),
  }),
  apply(ctx, config) {
    ctx.ledger.migrate('provider-threads', schema)
    const stores = { threads: createThreadStore(ctx.ledger.db), handoffs: createHandoffStore(ctx.ledger.db) }
    ctx.provide(providerThreads, createThreads(ctx, stores, config.handoff_tokens))
  },
})

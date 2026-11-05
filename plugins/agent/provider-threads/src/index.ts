import { sessionRemove, sessionSettle } from '@sand/chats/contract'
import { providerThreads } from '@sand/turns-contract/contract'
import { definePlugin } from 'drydock'
import { z } from 'zod'
import { inject } from './context'
import { handoffCap } from './handoff/budget'
import { createThreads } from './prepare'
import { schema } from './store/schema'
import { createThreadStore } from './store/threads'

export default definePlugin({
  name: 'provider-threads',
  description: 'Keeps what each model of a chat has seen, so a model keeps its cached prefix and a switch hands over only what fits',
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
    const store = createThreadStore(ctx.ledger.db)
    ctx.provide(providerThreads, createThreads(ctx, store, config.handoff_tokens))
    const release = (session: string) => store.open(session).forEach(thread => ctx.llm.release?.(thread.id))
    ctx.on(sessionSettle, session => release(session.id))
    ctx.on(sessionRemove, session => {
      release(session)
      store.remove(session)
    })
  },
})

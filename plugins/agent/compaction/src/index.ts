import { llm } from '@sand/accounts/contract'
import { entryViews, type Conversation } from '@sand/engine/contract'
import { media } from '@sand/media/contract'
import { providerThreads, stepSettle } from '@sand/provider-threads/contract'
import { server } from '@sand/server/contract'
import { tokensOf } from '@sand/usage/contract'
import { definePlugin } from 'drydock'
import { autoCompact } from './auto'
import { budgetOf, usageOf } from './budget'
import { createCompactor } from './compact'
import { config } from './config'
import { contextLimits, contextUsage } from './contract'
import { compactionView } from './history/summary'
import { idleCompact } from './idle'
import { createTracker } from './measure/tracker'
import { serveUsage } from './usage'

export default definePlugin({
  name: 'compaction',
  inject: { llm, media, entryViews },
  config,
  apply(ctx, config) {
    const tracker = createTracker()
    const compactor = createCompactor(ctx, config, tracker)
    autoCompact(ctx, compactor, tracker)
    idleCompact(ctx, compactor, tracker)
    ctx.effect(() => ctx.entryViews.register(compactionView))
    ctx.provide(contextLimits, { limit: model => budgetOf(ctx.llm, config, model).limit })

    ctx.on(stepSettle, (request, conversation, _turn, usage) => {
      const used = tokensOf(usage)
      tracker.done(conversation.id, request, used)
      ctx.emit(contextUsage, conversation, usageOf(compactor.budget(request), request, used))
    })

    const read = async (conversation: Conversation) => {
      const request = await ctx.get(providerThreads)?.view(conversation)
      return request && usageOf(compactor.budget(request), request, tracker.project(conversation.id, request))
    }
    ctx.watch(server, found => (found ? serveUsage(ctx, found, read) : undefined))
  },
})

import { llm } from '@sand/accounts/contract'
import { entryViews, type Conversation } from '@sand/engine/contract'
import { media } from '@sand/media/contract'
import { providerThreads, stepSettle } from '@sand/provider-threads/contract'
import { server } from '@sand/server/contract'
import { tokensOf } from '@sand/usage/contract'
import { definePlugin } from 'drydock'
import { autoCompact } from './auto'
import { budgetOf } from './budget'
import { createCompactor } from './compact'
import { config } from './config'
import { contextLimits, contextUsage, systemParts } from './contract'
import { compactionView } from './history/summary'
import { idleCompact } from './idle'
import { createMeter } from './measure/meter'
import { createTracker } from './measure/tracker'
import { manualCompact } from './manual'
import { serveContext } from './serve'

export default definePlugin({
  name: 'compaction',
  inject: { llm, media, entryViews },
  config,
  apply(ctx, config) {
    const tracker = createTracker()
    const meter = createMeter(ctx.llm, config)
    const compactor = createCompactor(ctx, { config, tracker, meter })
    autoCompact(ctx, compactor, tracker)
    idleCompact(ctx, compactor, tracker)
    const compact = manualCompact(ctx, compactor)
    ctx.effect(() => ctx.entryViews.register(compactionView))
    ctx.provide(contextLimits, { limit: model => budgetOf(ctx.llm, config, model).limit })
    ctx.provide(systemParts, meter.parts)

    ctx.on(stepSettle, (request, conversation, _turn, usage) => {
      const used = tokensOf(usage)
      tracker.done(conversation.id, request, used)
      ctx.emit(contextUsage, conversation, meter.usage(request, used))
    })

    const read = async (conversation: Conversation) => {
      const request = await ctx.get(providerThreads)?.view(conversation)
      return request && meter.usage(request, tracker.project(conversation.id, request))
    }
    ctx.watch(server, found => (found ? serveContext(ctx, found, { read, compact }) : undefined))
  },
})

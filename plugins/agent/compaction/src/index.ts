import { llm } from '@sand/accounts/contract'
import { sandConfig } from '@sand/config/contract'
import { entryViews, type Conversation } from '@sand/engine/contract'
import { media } from '@sand/media/contract'
import { providerThreads, stepSettle } from '@sand/provider-threads/contract'
import { server } from '@sand/server/contract'
import { definePlugin } from 'drydock'
import { autoCompact } from './auto'
import { limitOf } from './budget'
import { createCompactor } from './compact'
import { config } from './config'
import { contextLimits, contextUsage, type IdleShares, systemParts } from './contract'
import { compactionView } from './history/summary'
import { idleCompact } from './idle'
import { createMeter } from './measure/meter'
import { contextUsed, createTracker } from './measure/tracker'
import { manualCompact } from './manual'
import { serveContext } from './serve'

const TABLE = ['plugins', 'compaction', 'idle']

export default definePlugin({
  name: 'compaction',
  inject: { llm, media, entryViews, sandConfig },
  config,
  apply(ctx, config) {
    let shares = config.idle
    const tracker = createTracker()
    const meter = createMeter(config)
    const compactor = createCompactor(ctx, { config, tracker, meter })
    autoCompact(ctx, compactor, tracker)
    idleCompact(ctx, compactor, tracker, () => shares)
    const compact = manualCompact(ctx, compactor)
    ctx.effect(() => ctx.entryViews.register(compactionView))
    ctx.provide(contextLimits, { limit: window => limitOf(config, window) })
    ctx.provide(systemParts, meter.parts)

    ctx.on(stepSettle, (request, conversation, _turn, done) => {
      const used = contextUsed(done)
      tracker.done(conversation.id, request, used)
      ctx.emit(contextUsage, conversation, meter.usage(request, used))
    })

    const read = async (conversation: Conversation) => {
      const request = await ctx.get(providerThreads)?.view(conversation)
      return request && meter.usage(request, tracker.project(conversation.id, request))
    }
    const idle = {
      current: () => shares,
      async set(next: IdleShares) {
        await ctx.sandConfig.set(TABLE, { ...next })
        shares = next
        return shares
      },
    }
    ctx.watch(server, found => (found ? serveContext(ctx, found, { read, compact, idle }) : undefined))
  },
})

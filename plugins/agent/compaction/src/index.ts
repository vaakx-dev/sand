import { llm, llmEvent } from '@sand/accounts/contract'
import type { Session } from '@sand/chats/contract'
import { entryViews } from '@sand/engine/contract'
import { media } from '@sand/media/contract'
import { modelSettings } from '@sand/model/contract'
import { providerThreads } from '@sand/provider-threads/contract'
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
    const budget = (session: Session) => budgetOf(ctx.llm, config, ctx.get(modelSettings)?.effective(session).model)

    ctx.on(llmEvent, (event, session) => {
      if (event.type !== 'done') return
      const used = tokensOf(event.usage)
      tracker.done(session.id, used)
      ctx.emit(contextUsage, session, usageOf(budget(session), used))
    })

    const read = async (session: Session) => {
      const request = await ctx.get(providerThreads)?.view(session)
      return request && usageOf(budget(session), tracker.project(session.id, request))
    }
    ctx.watch(server, found => (found ? serveUsage(ctx, found, read) : undefined))
  },
})

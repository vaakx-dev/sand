import type { Session } from '@sand/sessions-sqlite/contract'
import { tokensOf } from '@sand/kit'
import { definePlugin } from 'drydock'
import { autoCompact } from './auto'
import { budgetOf, usageOf } from './budget'
import { compactionUI } from './command'
import { createCompactor } from './compact'
import { config } from './config'
import { rewrite } from './history/rewrite'
import { createTracker } from './measure/tracker'
import { serveUsage } from './usage'

export default definePlugin({
  name: 'compaction',
  inject: ['llm'],
  config,
  apply(ctx, config) {
    const tracker = createTracker()
    const compactor = createCompactor(ctx, config, tracker)
    const schedule = autoCompact(ctx, compactor, tracker)
    const budget = (session: Session) => budgetOf(ctx.llm, config, ctx.modelSettings?.effective(session).model)

    ctx.on('llm.event', (event, session) => {
      if (event.type !== 'done') return
      const used = tokensOf(event.usage)
      tracker.done(session.id, used)
      ctx.emit('context.usage', session, usageOf(budget(session), used))
    })
    ctx.on('session.remove', session => tracker.reset(session.id))

    const read = async (session: Session) => {
      if (!ctx.context) return undefined
      const request = rewrite(session.path(), await ctx.context.build(session))
      return usageOf(budget(session), tracker.project(session.id, request))
    }
    ctx.watch('server', server => (server ? serveUsage(ctx, server, read) : undefined))

    ctx.plugin(compactionUI(compactor, schedule))
  },
})

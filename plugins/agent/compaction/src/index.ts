import { llm, llmEvent } from '@sand/accounts/contract'
import type { Session } from '@sand/chats/contract'
import { modelSettings } from '@sand/model/contract'
import { context } from '@sand/prompt/contract'
import { server } from '@sand/server/contract'
import { tokensOf } from '@sand/usage/records'
import { definePlugin } from 'drydock'
import { autoCompact } from './auto'
import { budgetOf, usageOf } from './budget'
import { createCompactor } from './compact'
import { config } from './config'
import { contextUsage } from './contract'
import { rewrite } from './history/rewrite'
import { idleCompact } from './idle'
import { createTracker } from './measure/tracker'
import { serveUsage } from './usage'

export default definePlugin({
  name: 'compaction',
  inject: { llm },
  config,
  apply(ctx, config) {
    const tracker = createTracker()
    const compactor = createCompactor(ctx, config, tracker)
    autoCompact(ctx, compactor, tracker)
    idleCompact(ctx, compactor, tracker)
    const budget = (session: Session) => budgetOf(ctx.llm, config, ctx.get(modelSettings)?.effective(session).model)

    ctx.on(llmEvent, (event, session) => {
      if (event.type !== 'done') return
      const used = tokensOf(event.usage)
      tracker.done(session.id, used)
      ctx.emit(contextUsage, session, usageOf(budget(session), used))
    })

    const read = async (session: Session) => {
      const builder = ctx.get(context)
      if (!builder) return undefined
      const request = rewrite(session.path(), await builder.build(session))
      return usageOf(budget(session), tracker.project(session.id, request))
    }
    ctx.watch(server, found => (found ? serveUsage(ctx, found, read) : undefined))
  },
})

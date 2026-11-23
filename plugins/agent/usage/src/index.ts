import { limitsRefresh, llm } from '@sand/accounts/contract'
import { sessions } from '@sand/chats/contract'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { historyOf, nativeSessions, usageChanged, usageHistory, usagePrices, usageReader, usageSummary } from './contract'
import { OutsideTurns } from './summary/outside'
import { pricesHandler } from './summary/prices'
import { summaryHandler } from './summary/serve'
import { summarize } from './summary/summarize'

export default definePlugin({
  name: 'usage',
  description: 'Token and cost totals and plan limits for the usage page and sand usage, from sand and from apps run outside it',
  inject: { sessions },
  apply(ctx) {
    const refreshLimits = () => {
      const current = ctx.get(llm)
      return current?.refreshLimits?.() ?? current?.limits?.()
    }
    const outside = new OutsideTurns({
      llm: () => ctx.get(llm),
      native: () => ctx.get(nativeSessions),
      changed: () => ctx.get(server)?.broadcast(usageChanged, undefined),
    })
    const summary = summaryHandler({ sessions: ctx.sessions, llm: () => ctx.get(llm), outside })
    ctx.provide(usageReader, { summary: query => summarize({ sessions: ctx.sessions, llm: ctx.get(llm) }, { ...query, origin: 'sand' }) })
    const history = ({ since, zone }: { since: number; zone: string }) => historyOf(summary({ since, bucket: 'hour', zone }))
    ctx.watch(server, found =>
      found
        ? joinDisposers(
            found.handle(usageSummary, summary),
            found.handle(usageHistory, history),
            found.handle(usagePrices, pricesHandler(() => ctx.get(llm))),
            found.handle(limitsRefresh, refreshLimits),
          )
        : undefined,
    )
  },
})

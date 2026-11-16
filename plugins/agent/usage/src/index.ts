import { limitsRefresh, llm } from '@sand/accounts/contract'
import { sessions } from '@sand/chats/contract'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { historyOf, usageHistory, usageReader, usageSummary } from './contract'
import { summaryHandler } from './summary/serve'

export default definePlugin({
  name: 'usage',
  description: 'Token and cost totals and plan limits for the usage page and sand usage',
  inject: { sessions },
  apply(ctx) {
    const refreshLimits = () => {
      const current = ctx.get(llm)
      return current?.refreshLimits?.() ?? current?.limits?.()
    }
    const summary = summaryHandler(ctx.sessions, () => ctx.get(llm))
    ctx.provide(usageReader, { summary })
    const history = ({ since, zone }: { since: number; zone: string }) => historyOf(summary({ since, bucket: 'hour', zone }))
    ctx.watch(server, found =>
      found ? joinDisposers(found.handle(usageSummary, summary), found.handle(usageHistory, history), found.handle(limitsRefresh, refreshLimits)) : undefined,
    )
  },
})

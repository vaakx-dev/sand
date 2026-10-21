import { limitsRefresh, llm } from '@sand/accounts/contract'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { usageSummary } from './contract'
import { summaryHandler } from './summary/serve'

export default definePlugin({
  name: 'usage',
  description: 'Token and cost totals and plan limits for the usage page and sand usage',
  apply(ctx) {
    const refreshLimits = () => {
      const current = ctx.get(llm)
      return current?.refreshLimits?.() ?? current?.limits?.()
    }
    ctx.watch(server, found =>
      found ? joinDisposers(found.handle(usageSummary, summaryHandler(ctx)), found.handle(limitsRefresh, refreshLimits)) : undefined,
    )
  },
})

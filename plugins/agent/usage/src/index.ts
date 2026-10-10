import type { Limits } from '@sand/llm-accounts/contract'
import { definePlugin } from 'drydock'
import { report } from './format'
import { limitsOf } from './limits'
import { summaryHandler } from './summary/serve'

const stale = 60_000

export default definePlugin({
  name: 'usage',
  description: 'Plan limits in /usage, plus token and cost totals for the usage page and sand usage',
  inject: ['ui'],
  apply(ctx) {
    const current = () => limitsOf(ctx.llm)

    const nameOf = (limits: Limits) => {
      const source = ctx.llm?.sources?.().find(found => found.id === limits.source)
      const label = source?.label ?? limits.source ?? 'Claude Code'
      return limits.pcName ? `${label} on ${limits.pcName}` : label
    }

    ctx.watch('server', server => {
      if (!server) return
      const disposers = [
        server.handle('usage.summary', summaryHandler(ctx)),
        server.handle('limits.refresh', () => ctx.llm?.refreshLimits?.() ?? ctx.llm?.limits?.()),
      ]
      return () => disposers.forEach(dispose => void dispose())
    })
    ctx.effect(() =>
      ctx.ui.command({
        name: 'usage',
        description: 'Show how much of your plan limits is left',
        async run() {
          let limits = current()
          if ((!limits.length || limits.some(found => Date.now() - found.updated > stale)) && ctx.llm?.refreshLimits) {
            ctx.ui.notify('Checking usage…')
            await ctx.llm.refreshLimits()
            limits = current()
          }
          if (!limits.length) return ctx.ui.notify('None of your accounts report plan limits')
          ctx.ui.report('Usage', report(limits, nameOf))
        },
      }),
    )
  },
})

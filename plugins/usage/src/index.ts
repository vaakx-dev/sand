import { definePlugin } from 'drydock'
import { report } from './format'
import { summaryHandler } from './summary/serve'

const stale = 60_000

export default definePlugin({
  name: 'usage',
  description: 'Plan limits in /usage, plus token and cost totals for the usage page and sand usage',
  inject: ['ui'],
  apply(ctx) {
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
          let limits = ctx.llm?.limits?.()
          if ((!limits || Date.now() - limits.updated > stale) && ctx.llm?.refreshLimits) {
            ctx.ui.notify('Checking usage…')
            limits = await ctx.llm.refreshLimits()
          }
          if (!limits) return ctx.ui.notify('This provider does not report usage limits')
          ctx.ui.report('Usage', report(limits))
        },
      }),
    )
  },
})

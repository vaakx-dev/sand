import { definePlugin } from 'drydock'
import { usageReport } from './report'

export default definePlugin({
  name: 'cli-usage',
  description: 'The sand usage command: tokens, API cost and plan limits',
  inject: ['cliCommands', 'daemon'],
  apply(ctx) {
    ctx.effect(() =>
      ctx.cliCommands.register({
        name: 'usage',
        summary: 'tokens, API cost and plan limits',
        usage: 'sand usage [24h | 7d | 30d | 90d]       tokens, API cost and plan limits (default 30d)',
        run: args => usageReport(ctx.daemon, args),
      }),
    )
  },
})

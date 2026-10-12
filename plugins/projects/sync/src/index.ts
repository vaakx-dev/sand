import { definePlugin } from 'drydock'
import { createSync } from './service'

export default definePlugin({
  name: 'sync',
  description: 'Copies project folders to other PCs and keeps them in step: snapshots, transfers, merges and conflicts',
  inject: ['cli', 'transfers'],
  uses: { server: 'the page cannot copy or sync projects' },
  apply(ctx) {
    const handlers = createSync(ctx.cli.home, ctx.transfers)
    ctx.watch('server', server => server?.handle(handlers))
  },
})

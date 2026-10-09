import { sandHome } from '@sand/host'
import { definePlugin } from 'drydock'
import { serveSync } from './serve'
import { createSync } from './service'

export default definePlugin({
  name: 'sync',
  description: 'Copies project folders to other PCs and keeps them in step: snapshots, transfers, merges and conflicts',
  inject: ['cli'],
  uses: { server: 'the page cannot copy or sync projects' },
  apply(ctx) {
    const sync = createSync(sandHome(ctx))
    ctx.effect(() => () => void sync.dispose())
    ctx.watch('server', server => (server ? serveSync(server, sync.handlers) : undefined))
  },
})

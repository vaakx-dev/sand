import type { Server } from '@sand/protocol'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { z } from 'zod'
import { remoteCommand } from './command'
import { loadDevice } from './device'
import { serveRemotes } from './serve'
import { remotesService } from './service'
import { remoteStore } from './store'

export default definePlugin({
  name: 'remotes',
  description: 'Other PCs running sand: pairs with them from a device link and connects to them',
  inject: ['cli'],
  uses: { server: 'the page cannot list or pair PCs', ui: 'no /remote command' },
  config: z.object({ name: z.string().optional() }),
  async apply(ctx, config) {
    const device = await loadDevice(ctx.cli.home, config.name)
    const store = await remoteStore(join(ctx.cli.home, 'remotes.json'))
    let server: Server | undefined
    const remotes = remotesService(device, store, () => server?.broadcast('remotes.change', [remotes.list()]))
    ctx.provide('remotes', remotes)

    ctx.watch('server', found => {
      server = found
      if (!found) return
      const unserve = serveRemotes(found, remotes)
      return () => {
        server = undefined
        unserve()
      }
    })
    ctx.watch('ui', ui => ui?.command(remoteCommand(ui, remotes)))
  },
})

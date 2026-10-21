import { runtime } from '@sand/host-runtimes/contract'
import { server } from '@sand/server/contract'
import { definePlugin } from 'drydock'
import { pluginsReload } from './contract'

export default definePlugin({
  name: 'reload',
  description: 'Starts a fresh runtime with every plugin reloaded from disk when the page asks',
  inject: { server, runtime },
  apply(ctx) {
    ctx.effect(() => ctx.server.handle(pluginsReload, () => ctx.runtime.swap()))
  },
})

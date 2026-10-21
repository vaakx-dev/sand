import { nav } from '@sand/nav/contract'
import { wire } from '@sand/web-client/contract'
import { definePlugin } from 'drydock'
import { pluginReload, pluginsReload, type Reload } from '../contract'
import { reloadFinished } from './finished'

export default definePlugin({
  name: 'reload-button',
  description: 'Sidebar footer button that reloads the plugins and spins until it finishes',
  inject: { wire },
  apply(ctx) {
    const reload: Reload = {
      async run() {
        const finished = reloadFinished(ctx, ctx.wire)
        await ctx.wire.call(pluginsReload, {})
        await finished
      },
    }
    const press = () => reload.run().catch(error => console.error(error))
    ctx.provide(pluginReload, reload)
    ctx.watch(nav, found => found?.action({ id: 'reload', label: 'Reload plugins', icon: 'reload', place: 'footer', end: true, order: 200, run: press }))
  },
})

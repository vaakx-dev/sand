import { composer } from '@sand/composer/contract'
import { threadPcs, wire } from '@sand/devices-contract'
import { nav } from '@sand/nav/contract'
import { definePlugin } from 'drydock'
import { pluginsReload } from '../contract'
import { reloadFinished } from './finished'

export default definePlugin({
  name: 'reload-button',
  description: "Sidebar footer button and /reload command that reload the plugins on the current thread's PC and spin until they finish",
  inject: { wire },
  apply(ctx) {
    const reload = async () => {
      const pc = ctx.get(threadPcs)?.current()
      const finished = reloadFinished(ctx, ctx.wire, pc)
      await ctx.wire.call(pluginsReload, {}, pc)
      await finished
    }
    const press = () => reload().catch(error => console.error(error))
    ctx.watch(nav, found => found?.action({ id: 'reload', label: 'Reload plugins', icon: 'reload', place: 'footer', end: true, order: 200, run: press }))
    ctx.watch(composer, found => found?.command({ name: 'reload', description: 'Restart the sand plugins', run: reload }))
  },
})

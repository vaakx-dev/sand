import { composer } from '@sand/composer/contract'
import { threadPcs, wire } from '@sand/devices-contract'
import { toastsOf } from '@sand/toasts/contract'
import { shell } from '@sand/ui-shell/contract'
import { definePlugin } from 'drydock'
import { pluginsReload } from '../contract'
import { reloadFinished } from './finished'

export default definePlugin({
  name: 'reload-button',
  description: "Sidebar foot button and /reload command that reload the plugins on the current thread's PC and spin until they finish",
  inject: { wire },
  apply(ctx) {
    const reload = async () => {
      const pc = ctx.get(threadPcs)?.current()
      const finished = reloadFinished(ctx, ctx.wire, pc)
      await ctx.wire.call(pluginsReload, {}, pc)
      await finished
    }
    const press = () => void toastsOf(ctx).attempt('Couldn’t reload plugins', reload)
    ctx.watch(shell, found => found?.nav({ id: 'reload', label: 'Reload plugins', icon: 'reload', order: 200, place: 'foot-end', run: press }))
    ctx.watch(composer, found => found?.command({ name: 'reload', description: 'Restart the sand plugins', run: reload }))
  },
})

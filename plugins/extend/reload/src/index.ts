import { definePlugin } from 'drydock'
import { pluginsCommand, reloadCommand } from './commands'

const reloadUI = definePlugin({
  name: 'reload-ui',
  inject: ['ui', 'runtime'],
  uses: { inspector: '/plugins cannot show the plugin tree' },
  apply(ctx) {
    for (const command of [reloadCommand(ctx), pluginsCommand(ctx)]) ctx.effect(() => ctx.ui.command(command))
  },
})

export default definePlugin({
  name: 'reload',
  description: 'Restarts the sand plugins when you ask, with /reload or the sidebar button',
  inject: ['cli'],
  apply(ctx) {
    if (ctx.cli.mode === 'print') return
    ctx.plugin(reloadUI)
  },
})

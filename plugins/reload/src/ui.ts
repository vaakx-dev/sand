import { definePlugin } from 'drydock'
import { pluginsCommand } from './plugins'
import { reloadCommand } from './reload'

export const reloadUI = definePlugin({
  name: 'reload-ui',
  inject: ['ui', 'runtime'],
  apply(ctx) {
    for (const command of [reloadCommand(ctx), pluginsCommand(ctx)]) ctx.effect(() => ctx.ui.command(command))
  },
})

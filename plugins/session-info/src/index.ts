import { definePlugin } from 'drydock'
import { nameCommand } from './name'

export default definePlugin({
  name: 'session-info',
  inject: ['ui', 'sessions'],
  apply(ctx) {
    ctx.effect(() => ctx.ui.command(nameCommand(ctx)))
  },
})

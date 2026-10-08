import { definePlugin } from 'drydock'
import { goalCommand } from './command'
import { checkOnStop } from './stop'

export default definePlugin({
  name: 'goal',
  description: '/goal: the agent keeps working until a separate check confirms a condition holds',
  inject: ['llm', 'context', 'loop', 'sessions'],
  uses: { ui: 'there is no /goal command and goal changes are not announced' },
  apply(ctx) {
    ctx.on('turn.stop', checkOnStop(ctx))
    ctx.watch('ui', ui => ui?.command(goalCommand(ctx, ui)))
  },
})

import { definePlugin } from 'drydock'
import { treeCommand } from './command/tree'

export default definePlugin({
  name: 'tree-command',
  description: 'Thread tree (/tree): jump to any point, fork from it, and label entries',
  inject: ['ui', 'sessions'],
  uses: { loop: 'a running thread can be moved or forked mid-turn' },
  apply(ctx) {
    ctx.effect(() => ctx.ui.command(treeCommand(ctx)))
  },
})

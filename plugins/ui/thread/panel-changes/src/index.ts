import { definePlugin } from 'drydock'
import { changesCommand } from './changes/command'

export default definePlugin({
  name: 'changes-command',
  description: 'Edits (/changes): files the agent edited or wrote in the current thread, with +/− counts and diffs',
  inject: ['ui'],
  uses: { sessions: 'lists only the edits made in the thread itself, not by its sub-agents' },
  apply(ctx) {
    ctx.effect(() => ctx.ui.command(changesCommand(ctx)))
  },
})

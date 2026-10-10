import { definePlugin } from 'drydock'
import { changesCommand } from './changes/command'
import { serveChangedFiles } from './changes/serve'

export default definePlugin({
  name: 'changes-command',
  description: 'Edits (/changes): files the agent edited or wrote in the current thread, with +/− counts and diffs',
  inject: ['ui'],
  uses: {
    sessions: 'lists only the edits made in the thread itself, not by its sub-agents',
    server: 'the hidden Edits badge counts only the loaded part of the thread',
  },
  apply(ctx) {
    ctx.effect(() => ctx.ui.command(changesCommand(ctx)))
    ctx.watch('server', server => (server ? serveChangedFiles(ctx, server) : undefined))
  },
})

import { definePlugin } from 'drydock'
import { cloneCommand } from './clone'
import { forkCommand } from './fork'
import { newCommand } from './new'
import { resumeCommand } from './resume/command'
import { serveTransfer } from './transfer/serve'

export default definePlugin({
  name: 'sessions-ui',
  inject: ['ui', 'sessions'],
  apply(ctx) {
    const commands = [newCommand(ctx), resumeCommand(ctx), forkCommand(ctx), cloneCommand(ctx)]
    for (const command of commands) ctx.effect(() => ctx.ui.command(command))
    ctx.watch('server', server => (server ? serveTransfer(ctx, server) : undefined))
  },
})

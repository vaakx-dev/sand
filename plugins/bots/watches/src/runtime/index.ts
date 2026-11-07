import { botRemove } from '@sand/bots/contract'
import { mcpTools } from '@sand/mcp-server/contract'
import { server } from '@sand/server/contract'
import { definePlugin } from 'drydock'
import { inject } from './context'
import { serveWatches } from './serve'
import { offerTools } from './tools'
import { owner } from './view'
import { wakeBot } from './wake'

export default definePlugin({
  name: 'bot-watches',
  description:
    'Lets a bot listen to things it follows, like a page, a folder, a webhook or a GitHub repo: a cheap watcher runs, and the bot gets a turn in its own conversation only when something changed, to learn and tell the user what matters',
  inject,
  apply(ctx) {
    ctx.effect(() => ctx.watches.handle(owner, wakeBot(ctx.botTurns)))
    ctx.on(botRemove, bot => {
      for (const watch of ctx.watches.list(owner, bot)) ctx.watches.remove(watch.id)
    })
    ctx.watch(mcpTools, found => found && offerTools(ctx, found))
    ctx.watch(server, found => found && serveWatches(ctx, found))
  },
})

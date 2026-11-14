import { botRemove, jobRemove } from '@sand/bots/contract'
import { mcpTools } from '@sand/mcp-server/contract'
import { server } from '@sand/server/contract'
import { definePlugin } from 'drydock'
import { inject } from './context'
import { serveWatches } from './serve'
import { offerWatchTools } from '../tools'
import { contentOf, owner } from './view'
import { wakeBot } from './wake'

export default definePlugin({
  name: 'bot-watches',
  description:
    'Lets a bot listen to things it follows, like a page, a folder, a webhook or a GitHub repo: a cheap watcher runs, and the bot gets a turn in its own conversation only when something changed, to learn and tell the user what matters',
  inject,
  apply(ctx) {
    ctx.effect(() => ctx.watches.handle(owner, wakeBot(ctx.botTurns, id => ctx.bots.jobs.get(id))))
    ctx.on(botRemove, bot => {
      for (const watch of ctx.watches.list(owner, bot)) ctx.watches.remove(watch.id)
    })
    ctx.on(jobRemove, job => {
      for (const watch of ctx.watches.list(owner, job.bot)) if (contentOf(watch).job === job.id) ctx.watches.remove(watch.id)
    })
    ctx.watch(mcpTools, found => found && offerWatchTools(found))
    ctx.watch(server, found => found && serveWatches(ctx, found))
  },
})

import { sessionEntry } from '@sand/chats/contract'
import { contextKinds } from '@sand/context/contract'
import { mcpTools } from '@sand/mcp-server/contract'
import { threadStarted } from '@sand/orchestrator/contract'
import { server } from '@sand/server/contract'
import { definePlugin } from 'drydock'
import { botStartedWire } from '../contract'
import { offerBotTools } from '../mcp/tools'
import { createAsk } from './ask'
import { inject } from './context'
import { botContext } from './kind'
import { routeMentions } from './mention'
import { createReplies } from './replies'
import { serveBridge } from './serve'
import { replyView } from './view'

export default definePlugin({
  name: 'bot-bridge',
  description:
    'Lets threads and bots message each other: threads hand bots tasks and @ them in messages, bots start and message threads and each other and hear back when those threads and bots finish',
  inject,
  apply(ctx) {
    const ask = createAsk(ctx)
    ctx.on(sessionEntry, routeMentions(ctx, ask))
    ctx.effect(() => ctx.entryViews.register(replyView(ctx.bots, ask)))
    ctx.on(threadStarted, (thread, { owner, id }) => void (owner === 'bot' && ctx.get(server)?.broadcast(botStartedWire, [thread, id])))
    ctx.effect(() =>
      ctx.orchestrator.owner('bot', {
        deliver: (bot, { text, clientRequestId }) => ctx.bots.get(bot) && ctx.botTurns.send(bot, { prompt: text, origin: 'job', clientRequestId }),
        label: bot => ctx.bots.get(bot)?.name,
        project: bot => ctx.bots.get(bot)?.project ?? undefined,
      }),
    )
    ctx.watch(contextKinds, found => found?.register(botContext(ctx.bots)))
    ctx.watch(mcpTools, found => found && offerBotTools(found))
    serveBridge(ctx, ask, createReplies(ctx, ask))
  },
})

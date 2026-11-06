import { mcpTools } from '@sand/mcp-server/contract'
import { definePlugin } from 'drydock'
import { offerBotTools } from '../tools'
import { createAsk } from './ask'
import { inject } from './context'
import { createReplies } from './replies'
import { serveBots } from './serve'

export default definePlugin({
  name: 'bots-mcp',
  description:
    "Serves sand's bot tools to its own threads and bots and to outside agents: list bots, hand them tasks and report their replies back, read their conversations, and rename them, write their jobs and set their projects",
  inject,
  apply(ctx) {
    const ask = createAsk(ctx)
    ctx.watch(mcpTools, found => found && offerBotTools(found))
    serveBots(ctx, ask, createReplies(ctx, ask))
  },
})

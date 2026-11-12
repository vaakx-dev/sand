import { mcpTools } from '@sand/mcp-server/contract'
import { definePlugin } from 'drydock'
import { offerBotTools } from './tools'

export default definePlugin({
  name: 'bots-mcp',
  description: "Offers sand's bot tools to its own threads and bots and to outside agents: list bots, hand them tasks, and rename them, write their jobs and set their limits",
  apply(ctx) {
    ctx.watch(mcpTools, found => found && offerBotTools(found))
  },
})

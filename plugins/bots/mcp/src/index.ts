import { mcpTools } from '@sand/mcp-server/contract'
import { definePlugin } from 'drydock'
import { offerBotTools } from './tools'

export default definePlugin({
  name: 'bots-mcp-tools',
  description: "Offers sand's bot tools to outside agents over MCP: list bots, hand them tasks, read their conversations, and rename them, write their jobs and set their projects",
  apply(ctx) {
    ctx.watch(mcpTools, found => found && offerBotTools(found))
  },
})

import { mcpTools } from '@sand/mcp-server/contract'
import { definePlugin } from 'drydock'
import { offerBotTools } from './tools'

export default definePlugin({
  name: 'bot-bridge-mcp',
  description: "Serves sand's bot tools to outside agents over MCP: list bots, hand them tasks, read their conversations and set the project each manages",
  apply(ctx) {
    ctx.watch(mcpTools, found => found && offerBotTools(found))
  },
})

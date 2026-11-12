import { mcpTools } from '@sand/mcp-server/contract'
import { definePlugin } from 'drydock'
import { offerWatchTools } from './tools'

export default definePlugin({
  name: 'bot-watches-tools',
  description: 'Offers outside agents over MCP the tools to make a bot listen to something and wake only when it changes, and to list and remove what it listens to',
  apply(ctx) {
    ctx.watch(mcpTools, found => found && offerWatchTools(found))
  },
})

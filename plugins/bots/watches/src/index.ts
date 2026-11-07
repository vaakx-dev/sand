import { mcpTools } from '@sand/mcp-server/contract'
import { definePlugin } from 'drydock'
import { offerOutsideTools } from './tools'

export default definePlugin({
  name: 'bot-watches-mcp-tools',
  description: 'Offers outside agents over MCP the tools to make a bot listen to something and wake only when it changes, and to list and remove what it listens to',
  apply(ctx) {
    ctx.watch(mcpTools, found => found && offerOutsideTools(found))
  },
})

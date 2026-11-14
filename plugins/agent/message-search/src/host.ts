import { mcpTools } from '@sand/mcp-server/contract'
import { definePlugin } from 'drydock'
import { offerSearchTool } from './tools'

export default definePlugin({
  name: 'message-search-tools',
  description: 'Offers message search to outside agents over MCP',
  apply(ctx) {
    ctx.watch(mcpTools, found => found && offerSearchTool(found))
  },
})

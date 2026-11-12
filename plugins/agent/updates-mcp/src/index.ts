import { mcpTools } from '@sand/mcp-server/contract'
import { definePlugin } from 'drydock'
import { offerUpdateTools } from './tools'

export default definePlugin({
  name: 'updates-mcp',
  description: "Offers sand's update tools to its own threads and bots and to outside agents over MCP: check for, install and restart into newer sand releases",
  apply(ctx) {
    ctx.watch(mcpTools, found => found && offerUpdateTools(found))
  },
})

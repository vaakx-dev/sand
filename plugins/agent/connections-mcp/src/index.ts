import { mcpTools } from '@sand/mcp-server/contract'
import { definePlugin } from 'drydock'
import { offerConnectionTools } from './tools'

export default definePlugin({
  name: 'connections-mcp',
  description: "Offers sand's connection tools to its own threads and bots and to outside agents over MCP: list, connect and disconnect accounts at other services",
  apply(ctx) {
    ctx.watch(mcpTools, found => found && offerConnectionTools(found))
  },
})

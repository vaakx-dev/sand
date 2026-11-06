import { mcpTools } from '@sand/mcp-server/contract'
import { definePlugin } from 'drydock'
import { offerProjectTools } from './tools'

export default definePlugin({
  name: 'projects-mcp-tools',
  description: "Offers sand's project tools to outside agents over MCP: list, add, create, rename, hide and remove projects, and set where new ones go",
  apply(ctx) {
    ctx.watch(mcpTools, found => found && offerProjectTools(found))
  },
})

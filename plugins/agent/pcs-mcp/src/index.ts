import { mcpTools } from '@sand/mcp-server/contract'
import { definePlugin } from 'drydock'
import { offerPcTools } from './tools'

export default definePlugin({
  name: 'pcs-mcp',
  description: "Offers sand's PC tools to its own threads and bots and to outside agents over MCP: list your PCs and copy files and folders between them",
  apply(ctx) {
    ctx.watch(mcpTools, found => found && offerPcTools(found))
  },
})

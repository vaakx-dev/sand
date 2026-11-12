import { mcpTools } from '@sand/mcp-server/contract'
import { definePlugin } from 'drydock'
import { offerLogbookTools } from './tools'

export default definePlugin({
  name: 'logbook-tools',
  description: 'Offers the Logbook tools to outside agents over MCP',
  apply(ctx) {
    ctx.watch(mcpTools, found => found && offerLogbookTools(found))
  },
})

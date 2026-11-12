import { mcpTools } from '@sand/mcp-server/contract'
import { definePlugin } from 'drydock'
import { offerAccountTools } from './tools'

export default definePlugin({
  name: 'accounts-mcp',
  description: "Offers sand's model account tools to its own threads and bots and to outside agents over MCP: sign in and out, save API keys, add local servers and share accounts",
  apply(ctx) {
    ctx.watch(mcpTools, found => found && offerAccountTools(found))
  },
})

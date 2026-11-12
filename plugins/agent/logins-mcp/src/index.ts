import { mcpTools } from '@sand/mcp-server/contract'
import { definePlugin } from 'drydock'
import { offerLoginTools } from './tools'

export default definePlugin({
  name: 'logins-mcp',
  description:
    "Offers sand's saved login tools to its own threads and bots and to outside agents over MCP: list, add, change and remove logins, choose who may use them, connect password managers and answer secret and code requests, never showing a value",
  apply(ctx) {
    ctx.watch(mcpTools, found => found && offerLoginTools(found))
  },
})

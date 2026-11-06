import { mcpTools } from '@sand/mcp-server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { botMcpTools } from './tools'

export default definePlugin({
  name: 'bot-bridge-mcp',
  description: "Serves sand's bots over MCP: outside agents list bots, hand them tasks and read their conversations",
  apply(ctx) {
    ctx.watch(mcpTools, found => found && joinDisposers(...botMcpTools.map(tool => found.register(tool))))
  },
})

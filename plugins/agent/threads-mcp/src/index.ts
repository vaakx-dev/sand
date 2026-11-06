import { mcpTools } from '@sand/mcp-server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { threadTools } from './tools'

export default definePlugin({
  name: 'threads-mcp',
  description: "Offers sand's threads to outside agents over MCP: list, read, start, message, wait for and stop them",
  apply(ctx) {
    ctx.watch(mcpTools, found => found && joinDisposers(...threadTools.map(tool => found.register(tool))))
  },
})

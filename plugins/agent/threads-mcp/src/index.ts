import { mcpTools } from '@sand/mcp-server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { group, threadTools } from './tools'

export default definePlugin({
  name: 'threads-mcp',
  description: "Offers sand's thread tools to its own threads and bots and to outside agents over MCP: list, start, message, wait for, stop, rename, pin, snooze, settle and move threads, and read the history of any thread or bot",
  apply(ctx) {
    ctx.watch(mcpTools, found => found && joinDisposers(found.group(group), ...threadTools.map(tool => found.register(tool))))
  },
})

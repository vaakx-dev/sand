import { mcpTools } from '@sand/mcp-server/contract'
import { definePlugin } from 'drydock'
import { mergeTool } from './tool'

export default definePlugin({
  name: 'changes-mcp',
  description: 'Offers the thread_merge tool to outside agents over MCP',
  apply(ctx) {
    ctx.watch(mcpTools, found => found?.register(mergeTool))
  },
})

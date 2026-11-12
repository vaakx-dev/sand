import { server } from '@sand/server/contract'
import { tools } from '@sand/tools/contract'
import { definePlugin } from 'drydock'
import { mcpTools } from '../contract'
import { agentTool } from './tool'

export default definePlugin({
  name: 'mcp-server',
  description: "Gives sand's own threads and bots the same tools the MCP server offers outside agents, called as the thread or bot that uses them",
  inject: { tools, server },
  apply(ctx) {
    ctx.provide(mcpTools, {
      register: tool => ctx.tools.register(agentTool(ctx.server, tool)),
      group: group => ctx.tools.group({ ...group, load: 'on-demand' }),
    })
  },
})

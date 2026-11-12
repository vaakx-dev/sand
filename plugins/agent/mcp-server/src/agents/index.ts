import { features } from '@sand/config/contract'
import { server } from '@sand/server/contract'
import { tools } from '@sand/tools/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { type McpTool, mcpTools, toolsOn } from '../contract'
import { agentTool } from './tool'

export default definePlugin({
  name: 'mcp-server',
  description: "Gives sand's own threads and bots the same tools the MCP server offers outside agents, called as the thread or bot that uses them",
  inject: { tools, server },
  apply(ctx) {
    const on = (feature: string) => ctx.get(features)?.on(feature) ?? true
    const register = (tool: McpTool) => joinDisposers(...toolsOn([tool], on).map(shown => ctx.tools.register(agentTool(ctx.server, shown))))
    ctx.provide(mcpTools, {
      register,
      group: group => ctx.tools.group({ ...group, load: 'on-demand' }),
    })
  },
})

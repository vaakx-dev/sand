import { features } from '@sand/config/contract'
import { type McpTool, type McpTools, mcpTools, toolsOn } from '@sand/mcp-server/contract'
import type { Context } from 'drydock'

export const provideTools = (ctx: Context) => {
  const tools = new Map<string, McpTool>()
  const registry: McpTools = {
    register(tool) {
      if (tools.has(tool.name)) throw new Error(`The MCP tool ${tool.name} is already registered`)
      tools.set(tool.name, tool)
      return () => {
        if (tools.get(tool.name) === tool) tools.delete(tool.name)
      }
    },
    group: () => () => {},
  }
  ctx.provide(mcpTools, registry)
  return () => toolsOn([...tools.values()], feature => ctx.get(features)?.on(feature) ?? true)
}

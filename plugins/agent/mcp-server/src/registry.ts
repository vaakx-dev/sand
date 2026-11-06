import type { Context } from 'drydock'
import { type McpTool, type McpTools, mcpTools } from './contract'

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
  }
  ctx.provide(mcpTools, registry)
  return () => [...tools.values()]
}

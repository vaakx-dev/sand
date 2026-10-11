import type { ToolSpec } from '@sand/llm-accounts/contract'
import type { Tool } from './contract'
import { definePlugin } from 'drydock'
import { z } from 'zod'
import { run } from './run'

const spec = (tool: Tool): ToolSpec => {
  const { $schema, ...inputSchema } = z.toJSONSchema(tool.input, { io: 'input' })
  return { name: tool.name, description: tool.description, inputSchema }
}

export default definePlugin({
  name: 'tools',
  apply(ctx) {
    const tools = new Map<string, Tool>()
    ctx.provide('tools', {
      register(tool) {
        tools.set(tool.name, tool)
        return () => {
          if (tools.get(tool.name) === tool) tools.delete(tool.name)
        }
      },
      specs: () => [...tools.values()].sort((a, b) => a.name.localeCompare(b.name)).map(spec),
      notes: () => [...tools.values()].flatMap(tool => (tool.environment ? [tool.environment] : [])),
      run: (call, context) => run(tools.get(call.name), call, context),
    })
  },
})

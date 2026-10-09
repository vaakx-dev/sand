import type { Tool, ToolSpec } from '@sand/protocol'
import { z } from 'zod'

const specs = new WeakMap<Tool<any>, ToolSpec>()

export const spec = (tool: Tool<any>) => {
  let cached = specs.get(tool)
  if (!cached) {
    const { $schema, ...inputSchema } = z.toJSONSchema(tool.input, { io: 'input' }) as Record<string, unknown>
    specs.set(tool, (cached = { name: tool.name, description: tool.description, inputSchema }))
  }
  return cached
}

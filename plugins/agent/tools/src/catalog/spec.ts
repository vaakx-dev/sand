import type { ToolSpec } from '@sand/accounts/contract'
import { z } from 'zod'
import type { Tool } from '../contract'

const withoutSafeIntegerBounds = ({ jsonSchema }: { jsonSchema: z.core.JSONSchema.BaseSchema }) => {
  if (jsonSchema.maximum === Number.MAX_SAFE_INTEGER) delete jsonSchema.maximum
  if (jsonSchema.minimum === Number.MIN_SAFE_INTEGER) delete jsonSchema.minimum
}

const spec = (tool: Tool): ToolSpec => {
  const { $schema, ...inputSchema } = z.toJSONSchema(tool.input, { io: 'input', override: withoutSafeIntegerBounds })
  return { name: tool.name, description: tool.description, inputSchema, ...(tool.secret?.length && { secret: tool.secret }) }
}

export { spec }

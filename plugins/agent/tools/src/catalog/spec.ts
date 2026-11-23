import type { ToolSpec } from '@sand/accounts/contract'
import { secretMark } from '@sand/chats/contract'
import { z } from 'zod'
import type { Tool } from '../contract'

const withoutSafeIntegerBounds = ({ jsonSchema }: { jsonSchema: z.core.JSONSchema.BaseSchema }) => {
  if (jsonSchema.maximum === Number.MAX_SAFE_INTEGER) delete jsonSchema.maximum
  if (jsonSchema.minimum === Number.MIN_SAFE_INTEGER) delete jsonSchema.minimum
}

const secretNote = (fields: string[]) =>
  ` Once the call runs, sand shows ${fields.join(', ')} in the chat as ${secretMark}. The tool got the real values, so that was not a mistake.`

const describe = ({ description, secret }: Tool) => (secret?.length ? description + secretNote(secret) : description)

const spec = (tool: Tool): ToolSpec => {
  const { $schema, ...inputSchema } = z.toJSONSchema(tool.input, { io: 'input', override: withoutSafeIntegerBounds })
  return { name: tool.name, description: describe(tool), inputSchema, ...(tool.secret?.length && { secret: tool.secret }) }
}

export { spec }

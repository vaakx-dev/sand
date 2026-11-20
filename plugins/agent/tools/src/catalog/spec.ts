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

type Schema = z.core.JSONSchema._JSONSchema

const grouped = (type: string) => (type.includes(' | ') ? `(${type})` : type)

const objectType = (schema: z.core.JSONSchema.JSONSchema): string => {
  const properties = Object.entries(schema.properties ?? {})
  if (!properties.length && schema.additionalProperties) return `Record<string, ${typeOf(schema.additionalProperties)}>`
  const required = new Set(schema.required)
  return `{ ${properties.map(([name, value]) => `${name}${required.has(name) ? '' : '?'}: ${typeOf(value)}`).join(', ')} }`
}

const typeOf = (schema: Schema): string => {
  if (typeof schema === 'boolean') return 'unknown'
  if (schema.enum) return schema.enum.map(value => JSON.stringify(value)).join(' | ')
  if (schema.const !== undefined) return JSON.stringify(schema.const)
  if (schema.anyOf) return schema.anyOf.map(typeOf).join(' | ')
  switch (schema.type) {
    case 'string':
    case 'boolean':
    case 'null':
      return schema.type
    case 'integer':
    case 'number':
      return 'number'
    case 'array':
      return `${grouped(schema.items && !Array.isArray(schema.items) ? typeOf(schema.items) : 'unknown')}[]`
    case 'object':
      return objectType(schema)
  }
  return 'unknown'
}

const brief = (description: string) => description.split('\n')[0]!.split(/(?<=\.)\s/)[0]!

const signature = (tool: Tool) => {
  const { description, inputSchema } = spec(tool)
  return `tools.${tool.name}(${typeOf(inputSchema as Schema)}): ${brief(description)}`
}

export { signature, spec }

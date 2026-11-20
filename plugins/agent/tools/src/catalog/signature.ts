import type { ToolSpec } from '@sand/accounts/contract'
import type { z } from 'zod'

type Schema = z.core.JSONSchema._JSONSchema

type ObjectSchema = z.core.JSONSchema.JSONSchema

interface List {
  head: string
  items: string[]
}

const LIST_ITEM = '- '

const grouped = (type: string) => (type.includes(' | ') ? `(${type})` : type)

const mapLike = (schema: ObjectSchema) => !Object.keys(schema.properties ?? {}).length && Boolean(schema.additionalProperties)

const noteOf = (schema: Schema) => (typeof schema !== 'boolean' && schema.type === 'object' && mapLike(schema) && schema.description ? ` /* ${schema.description} */` : '')

const objectType = (schema: ObjectSchema): string => {
  if (mapLike(schema)) return `Record<string, ${typeOf(schema.additionalProperties!)}>`
  const required = new Set(schema.required)
  const field = ([name, value]: [string, Schema]) => `${name}${required.has(name) ? '' : '?'}: ${typeOf(value)}${noteOf(value)}`
  return `{ ${Object.entries(schema.properties ?? {}).map(field).join(', ')} }`
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

const listOf = (paragraph: string): List[] => {
  const [head = '', ...items] = paragraph.split('\n')
  const listed = head.endsWith(':') && items.length > 0 && items.every(item => item.startsWith(LIST_ITEM))
  return listed ? [{ head, items: items.map(item => item.slice(LIST_ITEM.length)) }] : []
}

const listsIn = (description: string) => description.split('\n\n').slice(1).flatMap(listOf)

const signature = ({ name, description, inputSchema }: ToolSpec) => `tools.${name}(${typeOf(inputSchema as Schema)}): ${brief(description)}`

const line = (spec: ToolSpec) => [signature(spec), ...listsIn(spec.description).map(({ head, items }) => `${head} ${items.join('; ')}`)].join(' ')

const lines = (spec: ToolSpec) => [signature(spec), ...listsIn(spec.description).flatMap(({ items }) => items.map(item => `${LIST_ITEM}${item}`))]

export { line, lines }

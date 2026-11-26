import { callsOf, type Message } from '@sand/chats/contract'
import type { ToolSpec } from '../contract'

const stringsIn = (value: unknown): string[] => {
  if (typeof value === 'string') return value ? [value] : []
  if (value && typeof value === 'object') return Object.values(value).flatMap(stringsIn)
  return []
}

const fieldValues = (input: unknown, fields: string[]) =>
  input && typeof input === 'object' ? Object.entries(input).flatMap(([key, value]) => (fields.includes(key) ? stringsIn(value) : [])) : []

const secretValues = (message: Message, tools: ToolSpec[]) => {
  const secret = new Map(tools.flatMap(tool => (tool.secret?.length ? [[tool.name, tool.secret] as const] : [])))
  const values = callsOf(message).flatMap(call => fieldValues(call.input, secret.get(call.name) ?? []))
  return [...new Set(values)]
}

export { secretValues }

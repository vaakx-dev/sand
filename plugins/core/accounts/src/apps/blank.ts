import { callsOf, type Message, secretMark } from '@sand/chats/contract'
import type { ToolSpec } from '../contract'

const markOnce = JSON.stringify(secretMark)

const markTwice = JSON.stringify(markOnce).slice(1, -1)

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

const blanked = (text: string, values: string[]) =>
  values.reduce((out, value) => {
    const once = JSON.stringify(value)
    const twice = JSON.stringify(once).slice(1, -1)
    return out.replaceAll(twice, markTwice).replaceAll(once, markOnce)
  }, text)

const blankFile = async (path: string, values: string[]) => {
  const text = await Bun.file(path).text()
  const out = blanked(text, values)
  if (out !== text) await Bun.write(path, out)
}

const blankFiles = (paths: string[], values: string[]) => Promise.all(paths.map(path => blankFile(path, values)))

export { blankFiles, secretValues }

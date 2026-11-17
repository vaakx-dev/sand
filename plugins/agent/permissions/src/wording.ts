import type { Act, Tool } from '@sand/tools/contract'
import { oneLine } from '@sand/util'
import { z } from 'zod'

const FIELD_CHARS = 160
const MOST_FIELDS = 4

const firstSentence = (text: string) => oneLine(text.split(/(?<=[.!?])\s|\n/)[0] ?? text, FIELD_CHARS).replace(/[.:]$/, '')

const words = (key: string) => key.replaceAll(/[_-]+/g, ' ').replaceAll(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()

const entriesOf = (value: unknown) => {
  const parsed = z.record(z.string(), z.unknown()).safeParse(value)
  return parsed.success ? Object.entries(parsed.data) : undefined
}

const fieldText = ([key, value]: [string, unknown]) => `${words(key)} ${shownValue(value)}`

const shownValue = (value: unknown): string => {
  if (typeof value === 'string') return `“${oneLine(value, FIELD_CHARS)}”`
  if (Array.isArray(value)) return value.map(shownValue).join(', ')
  const entries = entriesOf(value)
  if (entries) return entries.map(fieldText).join(', ')
  return String(value)
}

const filled = ([, value]: [string, unknown]) => value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && !value.length)

const fieldsOf = (input: unknown) => (entriesOf(input) ?? []).filter(filled).slice(0, MOST_FIELDS).map(fieldText)

export const wording = (act: Act, tool: Tool, shownInput: unknown) => {
  if (act.summary) return act.summary
  const fields = fieldsOf(shownInput)
  const what = firstSentence(tool.description)
  return fields.length ? `${what}: ${fields.join('; ')}` : what
}

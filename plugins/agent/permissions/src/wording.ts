import type { Act, Tool } from '@sand/tools/contract'
import { isRecord, oneLine } from '@sand/util'

const FIELD_CHARS = 160
const MOST_FIELDS = 4

const firstSentence = (text: string) => oneLine(text.split(/(?<=[.!?])\s|\n/)[0] ?? text, FIELD_CHARS).replace(/[.:]$/, '')

const words = (key: string) => key.replaceAll(/[_-]+/g, ' ').replaceAll(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()

const shownValue = (value: unknown): string => {
  if (typeof value === 'string') return `“${oneLine(value, FIELD_CHARS)}”`
  if (Array.isArray(value)) return value.map(shownValue).join(', ')
  if (isRecord(value)) return Object.entries(value).map(([key, inner]) => `${words(key)} ${shownValue(inner)}`).join(', ')
  return String(value)
}

const filled = ([, value]: [string, unknown]) => value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && !value.length)

const fieldsOf = (input: unknown) =>
  isRecord(input)
    ? Object.entries(input)
        .filter(filled)
        .slice(0, MOST_FIELDS)
        .map(([key, value]) => `${words(key)} ${shownValue(value)}`)
    : []

export const wording = (act: Act, tool: Tool, shownInput: unknown) => {
  if (act.summary) return act.summary
  const fields = fieldsOf(shownInput)
  const what = firstSentence(tool.description)
  return fields.length ? `${what}: ${fields.join('; ')}` : what
}

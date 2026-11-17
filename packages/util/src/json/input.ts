import { oneLine } from '../text/line'

const BRIEF_LENGTH = 200

const brief = (value: string) => value.length <= BRIEF_LENGTH && !value.includes('\n')

const leaves = (value: unknown): string[] => {
  if (value && typeof value === 'object') return Object.values(value).flatMap(leaves)
  if (value === null || value === undefined) return []
  return [String(value)]
}

const named = (input: unknown) => {
  if (!input || typeof input !== 'object') return undefined
  const fields = new Map(Object.entries(input))
  return [fields.get('label'), fields.get('title')].find((value): value is string => typeof value === 'string' && !!value)
}

const inputText = (input: unknown, max?: number) => {
  const all = leaves(input)
  const short = all.filter(brief)
  return oneLine(named(input) ?? (short.length ? short : all).join(' '), max)
}

export { inputText }

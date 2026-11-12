import { oneLine } from '../text/line'
import { isRecord } from './record'

const BRIEF_LENGTH = 200

const brief = (value: string) => value.length <= BRIEF_LENGTH && !value.includes('\n')

const leaves = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(leaves)
  if (isRecord(value)) return Object.values(value).flatMap(leaves)
  if (value === null || value === undefined) return []
  return [String(value)]
}

const named = (input: unknown) => (isRecord(input) ? [input.label, input.title].find(value => typeof value === 'string' && value) : undefined)

const inputText = (input: unknown, max?: number) => {
  const all = leaves(input)
  const short = all.filter(brief)
  const name = named(input)
  return oneLine(typeof name === 'string' ? name : (short.length ? short : all).join(' '), max)
}

export { inputText }

import type { ToolResultBlock } from '@sand/messages'
import { isRecord, oneLine, textOf } from '@sand/kit'

const short = (value: unknown) => typeof value !== 'string' || (value.length <= 200 && !value.includes('\n'))

export const inputSummary = (input: unknown) => {
  if (!isRecord(input)) return oneLine(String(input), 120)
  const named = [input.label, input.title].find(value => typeof value === 'string' && value)
  return oneLine(typeof named === 'string' ? named : Object.values(input).filter(short).map(String).join(' '), 120)
}

export const resultSummary = (result: ToolResultBlock) => oneLine(textOf(result.content, ' '), 120)

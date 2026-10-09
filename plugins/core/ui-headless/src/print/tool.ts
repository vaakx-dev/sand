import type { ToolResultBlock } from '@sand/protocol'
import { oneLine } from '@sand/kit'

const short = (value: unknown) => typeof value !== 'string' || (value.length <= 200 && !value.includes('\n'))

export const inputSummary = (input: unknown) => {
  if (typeof input !== 'object' || !input) return oneLine(String(input), 120)
  const { label, title } = input as { label?: unknown; title?: unknown }
  const named = [label, title].find(value => typeof value === 'string' && value)
  return oneLine(typeof named === 'string' ? named : Object.values(input).filter(short).map(String).join(' '), 120)
}

export const resultSummary = (result: ToolResultBlock) =>
  oneLine(result.content.flatMap(block => (block.type === 'text' ? [block.text] : [])).join(' '), 120)

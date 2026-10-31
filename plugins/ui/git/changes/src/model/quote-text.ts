import type { DiffLine } from '../patch/line'
import { pickedLines, type PickedLines } from './selection'

const signs: Partial<Record<DiffLine['kind'], string>> = { add: '+', del: '-', ctx: ' ' }

const rangeText = (numbers: number[]) => {
  const low = numbers.reduce((a, b) => Math.min(a, b))
  const high = numbers.reduce((a, b) => Math.max(a, b))
  return low === high ? String(low) : `${low}-${high}`
}

const where = (lines: DiffLine[]) => {
  const kept = lines.flatMap(line => (line.new === undefined ? [] : [line.new]))
  if (kept.length) return rangeText(kept)
  const removed = lines.flatMap(line => (line.old === undefined ? [] : [line.old]))
  return `${rangeText(removed)} (removed)`
}

const fenceFor = (body: string[]) => {
  const runs = body.flatMap(line => line.match(/`+/g) ?? [])
  const longest = runs.reduce((most, run) => Math.max(most, run.length), 0)
  return '`'.repeat(Math.max(3, longest + 1))
}

export const quoteText = (picked: PickedLines) => {
  const lines = pickedLines(picked)
  const body = lines.map(line => `${signs[line.kind] ?? ' '}${line.text}`)
  const fence = fenceFor(body)
  return [`${picked.path}:${where(lines)}`, `${fence}diff`, ...body, fence].join('\n')
}

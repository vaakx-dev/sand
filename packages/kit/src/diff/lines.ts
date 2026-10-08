import { plural } from '../text/plural'
import { lcsLines, type DiffLine } from './lcs'

export interface DiffOptions {
  context?: number
  gaps?: boolean
  maxCells?: number
}

const split = (text: string) => (text ? text.split('\n') : [])

const unchanged = (text: string): DiffLine => ({ kind: 'ctx', text })

const replaced = (before: string[], after: string[]) => [
  ...before.map((text): DiffLine => ({ kind: 'del', text })),
  ...after.map((text): DiffLine => ({ kind: 'add', text })),
]

const compare = (before: string[], after: string[], maxCells: number) => {
  let head = 0
  while (head < before.length && head < after.length && before[head] === after[head]) head++
  let tail = 0
  while (tail < before.length - head && tail < after.length - head && before[before.length - 1 - tail] === after[after.length - 1 - tail]) tail++
  const removed = before.slice(head, before.length - tail)
  const added = after.slice(head, after.length - tail)
  const middle = (removed.length + 1) * (added.length + 1) <= maxCells ? lcsLines(removed, added) : replaced(removed, added)
  return [...before.slice(0, head).map(unchanged), ...middle, ...before.slice(before.length - tail).map(unchanged)]
}

const nearChanges = (lines: DiffLine[], context: number) => {
  const near = new Uint8Array(lines.length)
  lines.forEach((line, index) => {
    if (line.kind === 'ctx') return
    for (let at = Math.max(0, index - context); at <= Math.min(lines.length - 1, index + context); at++) near[at] = 1
  })
  return near
}

const trim = (lines: DiffLine[], context: number, gaps: boolean) => {
  const near = nearChanges(lines, context)
  const out: DiffLine[] = []
  let skipped = 0
  const flush = () => {
    if (skipped && gaps) out.push({ kind: 'gap', text: plural(skipped, 'unmodified line') })
    skipped = 0
  }
  lines.forEach((line, index) => {
    if (!near[index]) return void skipped++
    flush()
    out.push(line)
  })
  flush()
  return out
}

export const diffLines = (before: string, after: string, { context = Infinity, gaps = true, maxCells = 1_000_000 }: DiffOptions = {}) => {
  const lines = compare(split(before), split(after), maxCells)
  return Number.isFinite(context) ? trim(lines, context, gaps) : lines
}

export const diffCounts = (lines: DiffLine[]) => ({
  add: lines.filter(line => line.kind === 'add').length,
  del: lines.filter(line => line.kind === 'del').length,
})

import { plural } from '../text/plural'
import { lcsLines, type DiffKind, type DiffLine } from './lcs'

const maxCells = 1_000_000

const split = (text: string) => (text ? text.split('\n') : [])

const unchanged = (text: string): DiffLine => ({ kind: 'ctx', text })

const replaced = (before: string[], after: string[]) => [
  ...before.map((text): DiffLine => ({ kind: 'del', text })),
  ...after.map((text): DiffLine => ({ kind: 'add', text })),
]

const lineDiff = (before: string[], after: string[]) => {
  let head = 0
  while (head < before.length && head < after.length && before[head] === after[head]) head++
  let tail = 0
  while (tail < before.length - head && tail < after.length - head && before[before.length - 1 - tail] === after[after.length - 1 - tail]) tail++
  const removed = before.slice(head, before.length - tail)
  const added = after.slice(head, after.length - tail)
  const middle = (removed.length + 1) * (added.length + 1) <= maxCells ? lcsLines(removed, added) : replaced(removed, added)
  return [...before.slice(0, head).map(unchanged), ...middle, ...before.slice(before.length - tail).map(unchanged)]
}

interface Kinded {
  kind: DiffKind
}

const nearChanges = (lines: Kinded[], context: number) => {
  const near = new Uint8Array(lines.length)
  lines.forEach((line, index) => {
    if (line.kind === 'ctx') return
    for (let at = Math.max(0, index - context); at <= Math.min(lines.length - 1, index + context); at++) near[at] = 1
  })
  return near
}

export const foldContext = <T extends Kinded>(lines: T[], context: number) => {
  const near = nearChanges(lines, context)
  const out: (T | T[])[] = []
  let hidden: T[] = []
  lines.forEach((line, index) => {
    if (!near[index]) {
      hidden.push(line)
      return
    }
    if (hidden.length) out.push(hidden)
    hidden = []
    out.push(line)
  })
  if (hidden.length) out.push(hidden)
  return out
}

export const trimContext = (lines: DiffLine[], context: number) =>
  foldContext(lines, context).map((item): DiffLine => (Array.isArray(item) ? { kind: 'gap', text: plural(item.length, 'unmodified line') } : item))

export const diffLines = (before: string, after: string, { context = Infinity }: { context?: number } = {}) => {
  const lines = lineDiff(split(before), split(after))
  return Number.isFinite(context) ? trimContext(lines, context) : lines
}

export const diffCounts = (lines: DiffLine[]) => ({
  add: lines.filter(line => line.kind === 'add').length,
  del: lines.filter(line => line.kind === 'del').length,
})

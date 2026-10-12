import { foldContext, type DiffKind } from '@sand/kit'
import type { FileChange, Hunk } from '../../changes/collect'
import { wordMarks, type Mark } from './words'

export interface Line {
  at: number
  kind: DiffKind
  text: string
  old?: number
  new?: number
  marks?: Mark[]
}

export type Row = { type: 'head'; text: string } | { type: 'line'; line: Line } | { type: 'fold'; id: string; count: number }

export type Pair = [left: Line | undefined, right: Line | undefined]

export type SplitRow = Exclude<Row, { type: 'line' }> | { type: 'pair'; pair: Pair }

const context = 3
const minFold = 4
const maxLines = 600
export const restId = 'rest'

const numbered = ({ lines, start }: Hunk, first: number): Line[] => {
  let old = start
  let now = start
  return lines.map(({ kind, text }, index) => {
    const line: Line = { at: first + index, kind, text, old: kind === 'add' ? undefined : old, new: kind === 'del' ? undefined : now }
    if (old !== undefined && kind !== 'add') old++
    if (now !== undefined && kind !== 'del') now++
    return line
  })
}

const pairs = (lines: Line[]) => {
  const out: Pair[] = []
  let at = 0
  while (at < lines.length) {
    const line = lines[at]!
    if (line.kind !== 'del' && line.kind !== 'add') {
      out.push([line, line])
      at++
      continue
    }
    const removed: Line[] = []
    const added: Line[] = []
    while (lines[at]?.kind === 'del') removed.push(lines[at++]!)
    while (lines[at]?.kind === 'add') added.push(lines[at++]!)
    for (let index = 0; index < Math.max(removed.length, added.length); index++) out.push([removed[index], added[index]])
  }
  return out
}

const headText = (hunk: Hunk, lines: Line[], index: number) => {
  if (hunk.start === undefined) return `Edit ${index + 1}`
  const olds = lines.filter(line => line.kind !== 'add').length
  const news = lines.filter(line => line.kind !== 'del').length
  return `@@ -${hunk.start},${olds} +${hunk.start},${news} @@`
}

const hunkRows = (hunk: Hunk, lines: Line[], index: number, open: ReadonlySet<string>): Row[] => [
  { type: 'head', text: headText(hunk, lines, index) },
  ...foldContext(lines, context).flatMap((item): Row[] => {
    if (!Array.isArray(item)) return [{ type: 'line', line: item }]
    const id = String(item[0]!.at)
    if (item.length < minFold || open.has(id)) return item.map(line => ({ type: 'line', line }))
    return [{ type: 'fold', id, count: item.length }]
  }),
]

const capped = (rows: Row[]) => {
  let shown = 0
  const end = rows.findIndex(row => row.type === 'line' && ++shown > maxLines)
  if (end < 0) return rows
  const count = rows.slice(end).filter(row => row.type === 'line').length
  return [...rows.slice(0, end), { type: 'fold', id: restId, count } satisfies Row]
}

export const fileLines = (file: FileChange) => {
  let first = 0
  return file.hunks.map(hunk => {
    const lines = numbered(hunk, first)
    first += lines.length
    return lines
  })
}

export const rowsOf = (file: FileChange, open: ReadonlySet<string>) => {
  const rows = fileLines(file).flatMap((lines, index) => hunkRows(file.hunks[index]!, lines, index, open))
  return open.has(restId) ? rows : capped(rows)
}

export const splitRows = (rows: Row[]) => {
  const out: SplitRow[] = []
  let run: Line[] = []
  const flush = () => {
    out.push(...pairs(run).map((pair): SplitRow => ({ type: 'pair', pair })))
    run = []
  }
  for (const row of rows) {
    if (row.type === 'line') run.push(row.line)
    else {
      flush()
      out.push(row)
    }
  }
  flush()
  return out
}

export const markWords = (rows: Row[]) => {
  for (const row of splitRows(rows)) {
    if (row.type !== 'pair') continue
    const [left, right] = row.pair
    if (left?.kind !== 'del' || right?.kind !== 'add') continue
    const marks = wordMarks(left.text, right.text)
    left.marks = marks?.before
    right.marks = marks?.after
  }
}

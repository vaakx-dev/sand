import type { ChangeDesc, Text } from '@codemirror/state'
import { quotedText, type QuoteRun } from '@sand/util'

export interface Span {
  from: number
  to: number
  run: QuoteRun
}

export interface Edit {
  changes?: { from: number; to?: number; insert: string }
  caret: number
}

const blank = (doc: Text, line: number) => !doc.line(line).text.trim()

const isSpace = (doc: Text, at: number) => /\s/.test(doc.sliceString(at, at + 1))

export const mapRun = (run: QuoteRun, changes: ChangeDesc): QuoteRun | undefined => {
  const from = changes.mapPos(run.from, 1)
  const to = changes.mapPos(run.to, -1)
  return to - from === run.to - run.from ? { ...run, from, to } : undefined
}

export const spans = (doc: Text, runs: QuoteRun[]): Span[] => {
  let claimed = -1
  return runs.map((run, index) => {
    const first = doc.lineAt(run.from).number
    const last = doc.lineAt(run.to).number
    const next = runs[index + 1]
    const above = first > 2 && blank(doc, first - 1) && doc.line(first - 2).from > claimed
    const below = last + 2 <= doc.lines && blank(doc, last + 1) && (!next || doc.line(last + 2).from < next.from)
    const span = { from: above ? doc.line(first - 1).from : run.from, to: below ? doc.line(last + 1).to : run.to, run }
    claimed = span.to
    return span
  })
}

export const edges = (doc: Text, span: Span) => ({ from: Math.max(0, span.from - 1), to: Math.min(doc.length, span.to + 1) })

export const quoting = (doc: Text, runs: QuoteRun[], from: number, to: number, quoted: string) => {
  let start = from
  while (start > 0 && isSpace(doc, start - 1)) start--
  let end = to
  while (end < doc.length && isSpace(doc, end)) end++
  const lines = quotedText([{ kind: 'quote', text: quoted }])
  const head = start > 0 ? '\n\n' : ''
  const insert = `${head}${lines}\n\n`
  const run: QuoteRun = { from: start + head.length, to: start + head.length + lines.length, text: quoted.trim() }
  const beforeQuote = runs.some(other => other.from === end)
  const edit: Edit = { changes: { from: start, to: end, insert }, caret: start + insert.length - (beforeQuote ? 1 : 0) }
  return { edit, run }
}

export const unquoting = (doc: Text, span: Span): Edit => {
  const before = span.from > 0 ? doc.lineAt(span.from - 1) : undefined
  const after = span.to < doc.length ? doc.lineAt(span.to + 1) : undefined
  const gap = before?.length && after?.length ? '\n' : ''
  const from = before?.to ?? span.from
  return { changes: { from, to: after?.from ?? span.to, insert: gap }, caret: from + gap.length }
}

export const lineBeside = (doc: Text, span: Span, forward: boolean) => (forward ? span.to < doc.length : span.from > 0)

export const beside = (doc: Text, span: Span, forward: boolean): Edit => {
  const at = forward ? doc.length : 0
  if (!lineBeside(doc, span, forward)) return { changes: { from: at, insert: '\n\n' }, caret: forward ? at + 2 : at }
  return { caret: forward ? span.to + 1 : span.from - 1 }
}

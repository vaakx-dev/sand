import type { Kit } from '@sand/ui-kit/contract'
import { div, type Child } from '@vaakx-dev/vrui'
import type { DiffLine, DiffNote } from '../contract'
import type { Highlight } from '../patch/highlight'
import { quotable } from '../patch/line'
import type { PatchRows } from '../patch/rows'
import type { SplitPair } from '../patch/split'

type Numbers = 'old' | 'new' | 'both'

export type IsPicked = (index: number) => () => boolean

export interface RowLook {
  kit: Kit
  picked?: IsPicked
  highlight?: Highlight
  notes: (DiffNote | null)[]
}

const filler: DiffLine = { kind: 'empty', text: '' }

const blankGap: DiffLine = { kind: 'gap', text: '' }

const lineRow = ({ kit, picked, highlight }: RowLook, lines: DiffLine[], index: number, numbers: Numbers) => {
  const line = lines[index]!
  if (!picked || !quotable(line)) return kit.diffRow(line, highlight, { numbers })
  return kit.diffRow(line, highlight, { numbers, selected: picked(index), row: { 'data-row': String(index) } })
}

const wide = (rows: HTMLElement[]) => div({ class: 'w-max min-w-full' }, rows)

const noteBlock = (note: DiffNote) => div({ class: 'font-sans' }, note())

const withNotes = <T>(items: T[], notesAfter: (item: T) => DiffNote[], render: (run: T[]) => HTMLElement) => {
  const parts: Child[] = []
  let run: T[] = []
  for (const item of items) {
    run.push(item)
    const after = notesAfter(item)
    if (!after.length) continue
    parts.push(render(run), ...after.map(noteBlock))
    run = []
  }
  if (!parts.length) return render(run)
  if (run.length) parts.push(render(run))
  return div(parts)
}

const notesAt = ({ notes }: RowLook, indexes: (number | undefined)[]) =>
  [...new Set(indexes)].flatMap(index => {
    const note = index === undefined ? null : notes[index]
    return note ? [note] : []
  })

export const unifiedRows = (look: RowLook, { lines }: PatchRows) =>
  withNotes(
    lines.map((_, index) => index),
    index => notesAt(look, [index]),
    run => div({ class: 'scrollbars-thin overflow-x-auto' }, wide(run.map(index => lineRow(look, lines, index, 'both')))),
  )

const sideRow = (look: RowLook, lines: DiffLine[], index: number | undefined, side: 'old' | 'new') => {
  if (index === undefined) return look.kit.diffRow(filler, undefined, { numbers: side })
  if (side === 'new' && lines[index]!.kind === 'gap') return look.kit.diffRow(blankGap, undefined, { numbers: side })
  return lineRow(look, lines, index, side)
}

const column = (look: RowLook, lines: DiffLine[], pairs: SplitPair[], side: 'old' | 'new') =>
  div(
    { class: ['scrollbars-thin min-w-0 flex-1 overflow-x-auto', side === 'old' && 'border-r border-neutral-800'] },
    wide(pairs.map(pair => sideRow(look, lines, side === 'old' ? pair.left : pair.right, side))),
  )

export const splitRows = (look: RowLook, { lines, pairs }: PatchRows) =>
  withNotes(
    pairs,
    pair => notesAt(look, [pair.left, pair.right]),
    run => div({ class: 'flex' }, column(look, lines, run, 'old'), column(look, lines, run, 'new')),
  )

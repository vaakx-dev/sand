import type { Kit } from '@sand/ui-kit/contract'
import { div } from '@vaakx-dev/vrui'
import type { Highlight } from '../patch/highlight'
import { quotable, type DiffLine } from '../patch/line'
import type { PatchRows } from '../patch/rows'
import type { SplitPair } from '../patch/split'

type Numbers = 'old' | 'new' | 'both'

export type IsPicked = (index: number) => () => boolean

export interface RowLook {
  kit: Kit
  picked: IsPicked
  highlight?: Highlight
}

const filler: DiffLine = { kind: 'empty', text: '' }

const blankGap: DiffLine = { kind: 'gap', text: '' }

const lineRow = ({ kit, picked, highlight }: RowLook, lines: DiffLine[], index: number, numbers: Numbers) => {
  const line = lines[index]!
  if (!quotable(line)) return kit.diffRow(line, highlight, { numbers })
  return kit.diffRow(line, highlight, { numbers, selected: picked(index), row: { 'data-row': String(index) } })
}

const wide = (rows: HTMLElement[]) => div({ class: 'w-max min-w-full' }, rows)

export const unifiedRows = (look: RowLook, { lines }: PatchRows) =>
  div({ class: 'overflow-x-auto' }, wide(lines.map((_, index) => lineRow(look, lines, index, 'both'))))

const sideRow = (look: RowLook, lines: DiffLine[], index: number | undefined, side: 'old' | 'new') => {
  if (index === undefined) return look.kit.diffRow(filler, undefined, { numbers: side })
  if (side === 'new' && lines[index]!.kind === 'gap') return look.kit.diffRow(blankGap, undefined, { numbers: side })
  return lineRow(look, lines, index, side)
}

const column = (look: RowLook, lines: DiffLine[], pairs: SplitPair[], side: 'old' | 'new') =>
  div(
    { class: ['min-w-0 flex-1 overflow-x-auto', side === 'old' && 'border-r border-neutral-800'] },
    wide(pairs.map(pair => sideRow(look, lines, side === 'old' ? pair.left : pair.right, side))),
  )

export const splitRows = (look: RowLook, { lines, pairs }: PatchRows) =>
  div({ class: 'flex' }, column(look, lines, pairs, 'old'), column(look, lines, pairs, 'new'))

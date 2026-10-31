import type { DiffLine } from './lcs'
import { div, read, span, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
import { markedText } from './diff-marks'

type Kind = DiffLine['kind']

type Side = 'old' | 'new'

export type Highlight = (code: string) => (Node | string)[]

export type DiffNumbers = 'none' | Side | 'both'

export interface DiffRowOptions {
  numbers?: DiffNumbers
  selected?: MaybeReactive<boolean>
  row?: Props<HTMLDivElement>
}

const marks: Record<Kind, string> = { add: '+', del: '−', ctx: ' ', gap: '⋯', empty: ' ' }

const tones: Record<Kind, { code: string; gutter: string }> = {
  add: { code: 'bg-success-500/10', gutter: 'bg-success-500/15 text-success-400/70' },
  del: { code: 'bg-danger-500/10', gutter: 'bg-danger-500/15 text-danger-400/70' },
  ctx: { code: '', gutter: 'text-neutral-500' },
  gap: { code: 'text-neutral-500', gutter: 'text-neutral-500' },
  empty: { code: 'bg-neutral-900', gutter: 'bg-neutral-900' },
}

const sides: Record<DiffNumbers, Side[]> = { none: [], old: ['old'], new: ['new'], both: ['old', 'new'] }

const selectedTint = 'bg-accent-500/15'

const plain: Highlight = code => [code]

const numberCell = (line: DiffLine, side: Side, pickable: boolean) =>
  span(
    { 'data-side': side, class: ['min-w-10 shrink-0 select-none px-2 text-right', tones[line.kind].gutter, pickable && 'cursor-pointer'] },
    line[side] === undefined ? '' : String(line[side]),
  )

const codeOf = (line: DiffLine, highlight: Highlight) => {
  if (line.kind === 'gap') return line.text || ' '
  if (line.marks?.length) return markedText(line)
  return highlight(line.text || ' ')
}

export const diffRow = (line: DiffLine, highlight = plain, { numbers = 'none', selected, row = {} }: DiffRowOptions = {}) => {
  const { class: extra, ...props } = row
  const pickable = selected !== undefined
  return div(
    { ...props, class: ['flex whitespace-pre text-neutral-100', pickable && (() => (read(selected ?? false) ? selectedTint : '')), extra] },
    ...sides[numbers].map(side => numberCell(line, side, pickable)),
    span({ class: ['w-6 shrink-0 select-none text-center', tones[line.kind].gutter] }, marks[line.kind]),
    span({ class: ['flex-1 pr-3', tones[line.kind].code] }, codeOf(line, highlight)),
  )
}

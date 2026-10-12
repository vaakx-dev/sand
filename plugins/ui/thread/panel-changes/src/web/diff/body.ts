import { closeButton, derive, div, dynamicChild, icon, rowButton, secondaryAction, span } from '@sand/dom'
import { plural } from '@sand/kit'
import type { FileChange } from '../../changes/collect'
import { blocksOf, selectionKey } from './blocks'
import { emptyCells, lineCells } from './line'
import { markWords, restId, rowsOf, splitRows, type Line, type Pair, type Row, type SplitRow } from './rows'
import type { DiffView } from './view'

type Fold = Extract<Row, { type: 'fold' }>

const divider = 'border-l border-neutral-800'

const headRow = (text: string) => div({ class: 'flex h-8 items-center bg-neutral-900 px-3 text-neutral-500' }, text)

const foldText = ({ id, count }: Fold) => (id === restId ? `Show ${plural(count, 'more line')}` : `Show ${plural(count, 'unmodified line')}`)

const foldRow = (row: Fold, view: DiffView) =>
  rowButton(
    { class: 'h-8 gap-2 bg-neutral-900 px-3 font-sans text-accent-400 hover:bg-neutral-800', onClick: () => view.expand(row.id) },
    icon('unfold', 14),
    foldText(row),
  )

const quoteBar = (view: DiffView) =>
  div(
    { class: 'flex items-center gap-2 border-t border-b border-neutral-800 bg-neutral-900 px-3 py-1.5 font-sans' },
    span({ class: 'min-w-0 flex-1 truncate text-neutral-400' }, view.selected()?.label ?? ''),
    secondaryAction({ size: 'sm', onClick: view.quote }, icon('reply', 14), 'Quote in reply'),
    closeButton({ size: 'sm', title: 'Clear selection', onClick: view.clear }),
  )

const withQuote = (row: HTMLElement, lines: (Line | undefined)[], view: DiffView) =>
  lines.some(line => line && line.at === view.selected()?.to) ? [row, quoteBar(view)] : [row]

const unifiedLine = (line: Line, view: DiffView) => div({ class: 'flex' }, lineCells(line, view.compact ? [line.new ?? line.old] : [line.old, line.new], view))

const splitLine = ([left, right]: Pair, view: DiffView) =>
  div(
    { class: 'flex' },
    left ? lineCells(left, [left.old], view) : emptyCells(),
    right ? lineCells(right, [right.new], view, divider) : emptyCells(divider),
  )

const drawn = (rows: (Row | SplitRow)[], view: DiffView) =>
  rows.flatMap(row => {
    if (row.type === 'head') return [headRow(row.text)]
    if (row.type === 'fold') return [foldRow(row, view)]
    if (row.type === 'pair') return withQuote(splitLine(row.pair, view), row.pair, view)
    return withQuote(unifiedLine(row.line, view), [row.line], view)
  })

const block = (rows: (Row | SplitRow)[], view: DiffView) => {
  const key = selectionKey(rows)
  return dynamicChild(
    derive(() => key(view.selected())),
    () => div({ class: 'contents' }, drawn(rows, view)),
  )
}

const lineClicks = (view: DiffView) => (event: MouseEvent) => {
  const cell = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-at]') : null
  if (cell?.dataset.at) view.select(Number(cell.dataset.at))
}

export const diffBody = (file: FileChange, view: DiffView) => {
  const rows = rowsOf(file, view.open)
  markWords(rows)
  return div(
    {
      class: ['font-mono text-xs leading-5 text-neutral-300', view.wrap ? 'whitespace-pre-wrap wrap-anywhere' : 'overflow-x-auto whitespace-pre'],
      onClick: lineClicks(view),
    },
    div(
      { class: !view.wrap && 'min-w-max' },
      blocksOf(view.split ? splitRows(rows) : rows).map(part => block(part, view)),
    ),
  )
}

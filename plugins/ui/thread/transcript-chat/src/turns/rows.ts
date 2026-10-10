import { div } from '@sand/dom'
import { itemRows } from '../rows'
import { row, type Row, type RowContext } from '../rows/row'
import type { Shown } from './fold'
import { turnRow } from './header'

const railed = (inner: Row, rail: boolean) =>
  row(inner.key, { inner: inner.data, rail }, data =>
    div(
      { class: () => (data.get().rail ? 'transcript-chat-rail ml-2 border-l border-neutral-800 pl-3' : '') },
      inner.view(data.map(value => value.inner)),
    ),
  )

export const shownRows = (entry: Shown, context: RowContext): Row[] => {
  if (entry.kind === 'turn') return [turnRow(entry, context)]
  return itemRows(entry.item, context).map(inner => railed(inner, entry.rail))
}

import { div } from '@vaakx-dev/vrui'
import { itemRows } from '../rows'
import { row, type Row, type RowContext } from '../rows/row'
import type { Shown } from './fold'
import { footRow } from './footer'
import { turnRow } from './header'

const railed = (inner: Row, rail: boolean) =>
  row(inner.key, { inner: inner.data, rail }, data =>
    div(
      { class: () => (data.get().rail ? 'ml-2 flow-root border-l border-neutral-800 pl-3' : '') },
      inner.view(
        data.map(value => value.inner),
        data.map(value => value.rail),
      ),
    ),
  )

export const shownRows = (entry: Shown, context: RowContext): Row[] => {
  if (entry.kind === 'turn') return [turnRow(entry, context)]
  if (entry.kind === 'foot') return [footRow(entry, context)]
  return itemRows(entry.item, context).map(inner => railed(inner, entry.rail))
}

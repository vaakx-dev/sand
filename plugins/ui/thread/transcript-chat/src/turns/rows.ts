import { div } from '@sand/dom'
import { itemRows, type Row, type RowContext } from '../rows'
import type { Shown, ShownItem } from './fold'
import { turnRow } from './header'

interface Railed {
  inner: unknown
  rail: boolean
}

const railClass = 'transcript-chat-rail ml-2 border-l border-neutral-800 pl-3'

const railed = (inner: Row, rail: boolean): Row => ({
  key: inner.key,
  data: { inner: inner.data, rail } satisfies Railed,
  view: data => div({ class: () => ((data.get() as Railed).rail ? railClass : '') }, inner.view(data.map(value => (value as Railed).inner))),
})

const itemShown = (entry: ShownItem, context: RowContext) => itemRows(entry.item, context).map(row => railed(row, entry.rail))

export const shownRows = (entry: Shown, context: RowContext): Row[] => (entry.kind === 'turn' ? [turnRow(entry, context)] : itemShown(entry, context))

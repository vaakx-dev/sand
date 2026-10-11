import { chevron, plainButton, untrack, type Reorder, type Sig } from '@sand/dom'
import type { MenuRequest } from '../card/menu'
import { card } from '../card/view'
import type { CardRow, HeadRow, MoreRow, Row } from './build'

export interface RowHandlers {
  minute: Sig<number>
  drag: Reorder
  pick(row: CardRow): void
  toggle(row: HeadRow): void
  more(row: MoreRow): void
  menu(request: MenuRequest): void
}

const head = (row: Sig<HeadRow>, handlers: RowHandlers) =>
  plainButton(
    {
      class: 'mt-2 flex h-6 w-full items-center gap-2 rounded-lg px-3 text-xs font-medium text-neutral-500 hover:text-neutral-400',
      onClick: () => handlers.toggle(row.get()),
    },
    chevron(() => row.get().open, 12),
    () => `${row.get().name} (${row.get().count})`,
  )

const more = (row: Sig<MoreRow>, handlers: RowHandlers) =>
  plainButton(
    {
      class: 'block w-full rounded-lg px-3 py-2 text-left text-xs text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300',
      onClick: () => handlers.more(row.get()),
    },
    () => `Show more (${row.get().hidden})`,
  )

export const rowView = (row: Sig<Row>, handlers: RowHandlers) => {
  const first = untrack(() => row.get())
  if (first.kind === 'head') return head(row.map(value => (value.kind === 'head' ? value : first)), handlers)
  if (first.kind === 'more') return more(row.map(value => (value.kind === 'more' ? value : first)), handlers)
  return card(row.map(value => (value.kind === 'card' ? value : first)), handlers.minute, handlers.pick, handlers.drag, handlers.menu)
}

import { chevron, plainButton, untrack, type Reorder, type Sig } from '@sand/dom'
import type { MenuRequest } from '../card/menu'
import { card } from '../card/view'
import { pageStep, type CardRow, type HeadRow, type MoreRow, type Row } from './build'

const quietRow = 'flex h-6 w-full items-center gap-2 rounded-md px-3 text-xs text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-100'

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
      class: [quietRow, 'mt-2 font-medium'],
      onClick: () => handlers.toggle(row.get()),
    },
    chevron(() => row.get().open, 12),
    () => `${row.get().name} (${row.get().count})`,
  )

const more = (row: Sig<MoreRow>, handlers: RowHandlers) =>
  plainButton(
    {
      class: quietRow,
      onClick: () => handlers.more(row.get()),
    },
    () => `Show ${Math.min(row.get().hidden, pageStep)} more`,
  )

export const rowView = (row: Sig<Row>, handlers: RowHandlers) => {
  const first = untrack(() => row.get())
  if (first.kind === 'head') return head(row.map(value => (value.kind === 'head' ? value : first)), handlers)
  if (first.kind === 'more') return more(row.map(value => (value.kind === 'more' ? value : first)), handlers)
  return card(row.map(value => (value.kind === 'card' ? value : first)), handlers.minute, handlers.pick, handlers.drag, handlers.menu)
}

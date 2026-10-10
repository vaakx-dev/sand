import { button, chevron, focusable, untrack, type Reorder, type Sig } from '@sand/dom'
import { card, type CardRow } from './card'
import type { MenuRequest } from './menu/view'
import type { Row } from './rows'

export interface RowHandlers {
  minute: Sig<number>
  drag: Reorder
  pick(row: CardRow): void
  toggle(row: Extract<Row, { kind: 'head' }>): void
  more(row: Extract<Row, { kind: 'more' }>): void
  menu(request: MenuRequest): void
}

const head = (row: Sig<Extract<Row, { kind: 'head' }>>, handlers: RowHandlers) =>
  button(
    {
      type: 'button',
      class: [focusable, 'mt-2 flex h-6 w-full items-center gap-2 rounded-lg px-3 text-xs font-medium text-neutral-500 hover:text-neutral-400'],
      onClick: () => handlers.toggle(row.get()),
    },
    chevron(() => row.get().open, 12),
    () => `${row.get().name} (${row.get().count})`,
  )

const more = (row: Sig<Extract<Row, { kind: 'more' }>>, handlers: RowHandlers) =>
  button(
    {
      type: 'button',
      class: [focusable, 'block w-full rounded-lg px-3 py-2 text-left text-xs text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300'],
      onClick: () => handlers.more(row.get()),
    },
    () => `Show more (${row.get().hidden})`,
  )

export const rowView = (row: Sig<Row>, handlers: RowHandlers) => {
  const kind = untrack(() => row.get().kind)
  if (kind === 'head') return head(row as Sig<Extract<Row, { kind: 'head' }>>, handlers)
  if (kind === 'more') return more(row as Sig<Extract<Row, { kind: 'more' }>>, handlers)
  return card(row as Sig<CardRow & Row>, handlers.minute, handlers.pick, handlers.drag, handlers.menu)
}

import type { PaletteItem, PaletteItemAction } from '@sand/protocol'
import { div, icon, menuItem, optionProps, projectIcon, read, rowAction, span, working, type Listbox, type MaybeReactive } from '@sand/dom'

const lead = (item: PaletteItem) => {
  if (item.busy) return working(16)
  if (item.avatar) return projectIcon(item.avatar, item.avatarIcon)
  return icon(item.icon ?? 'right', 16)
}

const withActions = (row: HTMLElement, actions: PaletteItemAction[], active: () => boolean, act: (action: PaletteItemAction) => void) =>
  div(
    { class: 'group relative' },
    row,
    div(
      { class: ['pointer-events-none absolute inset-0 flex items-center justify-end gap-1 pr-2', () => (active() ? '' : 'opacity-0 group-hover:opacity-100')] },
      actions.map(action => div({ class: 'pointer-events-auto' }, rowAction({ label: action.label, danger: action.danger, run: () => act(action) }))),
    ),
  )

export const rowView = (item: PaletteItem, position: MaybeReactive<number>, box: Listbox, act: (action: PaletteItemAction) => void) => {
  const active = () => box.isSelected(read(position))
  const { onMouseMove, ...option } = optionProps(box, position)
  const row = menuItem(
    {
      ...option,
      ...(item.disabled ? {} : { onMouseMove }),
      active,
      'aria-disabled': item.disabled,
      class: ['py-1', item.disabled && 'cursor-default opacity-50'],
    },
    span({ class: 'inline-flex w-5 shrink-0 justify-center text-neutral-400' }, lead(item)),
    span(
      { class: 'flex min-w-0 flex-1 flex-col' },
      span({ class: 'truncate', title: item.label }, item.label),
      item.detail ? span({ class: 'truncate text-xs text-neutral-500', title: item.detail }, item.detail) : null,
    ),
    item.meta ? span({ class: 'shrink-0 text-xs text-neutral-500 tabular-nums' }, item.meta) : null,
    item.page ? span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon('right', 14)) : null,
    item.actions?.length ? span({ class: 'w-20 shrink-0' }) : null,
  )
  return item.actions?.length ? withActions(row, item.actions, active, act) : row
}

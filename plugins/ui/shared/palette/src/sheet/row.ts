import type { PaletteItem } from '../contract'
import { div, icon, iconButton, menuItem, optionProps, projectIcon, read, span, stopThen, working, type Listbox, type MaybeReactive } from '@sand/dom'

const lead = (item: PaletteItem) => {
  if (item.busy) return working(16)
  if (item.avatar) return projectIcon(item.avatar, item.avatarIcon)
  return icon(item.icon ?? 'right', 16)
}

const withMore = (row: HTMLElement, item: PaletteItem, active: () => boolean, more: (item: PaletteItem) => void) =>
  div(
    { class: 'group relative' },
    row,
    div(
      { class: 'absolute inset-y-0 right-1 flex items-center' },
      iconButton(
        {
          title: `More for ${item.label}`,
          'aria-label': `More for ${item.label}`,
          class: () => (active() ? '' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'),
          onClick: stopThen(() => more(item)),
        },
        icon('more', 16),
      ),
    ),
  )

export const rowView = (item: PaletteItem, position: MaybeReactive<number>, box: Listbox, more: (item: PaletteItem) => void) => {
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
      span({ class: ['truncate', item.danger && 'text-danger-400'], title: item.label }, item.label),
      item.detail ? span({ class: 'truncate text-xs text-neutral-500', title: item.detail }, item.detail) : null,
    ),
    item.meta ? span({ class: 'shrink-0 text-xs text-neutral-500 tabular-nums' }, item.meta) : null,
    item.page ? span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon('right', 14)) : null,
    item.actions?.length ? span({ class: 'w-8 shrink-0' }) : null,
  )
  return item.actions?.length ? withMore(row, item, active, more) : row
}

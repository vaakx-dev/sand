import type { PaletteItem } from '../contract'
import type { ContextMenu, Kit } from '@sand/ui-kit/contract'
import { div, read, span, stopThen, type MaybeReactive } from '@vaakx-dev/vrui'
import { actionsMenu } from './actions'
import type { PageModel } from './model'

const lead = ({ icon, projectIcon, working }: Kit, item: PaletteItem) => {
  if (item.busy) return working(16)
  if (item.avatar) return projectIcon(item.avatar, item.avatarIcon)
  return item.icon ? icon(item.icon, 16) : undefined
}

const withMore = ({ icon, iconButton }: Kit, row: HTMLElement, item: PaletteItem, active: () => boolean, more: (item: PaletteItem) => void) =>
  div(
    { class: 'group relative' },
    row,
    div(
      { class: 'absolute inset-y-0 right-1 flex items-center' },
      iconButton(
        {
          title: `More for ${item.label}`,
          'aria-label': `More for ${item.label}`,
          surface: 'raised',
          class: () => (active() ? '' : 'opacity-0 group-hover:opacity-100 group-focus-visible-within:opacity-100 touch:opacity-100'),
          onClick: stopThen(() => more(item)),
        },
        icon('more', 16),
      ),
    ),
  )

export const rowView = (kit: Kit, item: PaletteItem, position: MaybeReactive<number>, model: PageModel, menu: ContextMenu) => {
  const { icon, listRow, optionProps } = kit
  const hasActions = Boolean(item.actions?.length)
  const active = () => model.box.isSelected(read(position))
  const { onMouseMove, onClick, ...option } = optionProps(model.box, position)
  const row = listRow({
    ...option,
    ...(hasActions ? menu.target(() => actionsMenu(item, model.runAction), onClick) : { onClick }),
    ...(item.disabled ? {} : { onMouseMove }),
    disabled: item.disabled,
    surface: 'raised',
    touch: true,
    ...(item.danger && { tone: 'danger' as const }),
    lead: lead(kit, item),
    title: item.label,
    meta: item.detail,
    trail:
      item.meta || item.page || hasActions
        ? [
            item.meta ? span({ class: 'tabular-nums' }, item.meta) : null,
            item.page ? span({ class: 'inline-flex' }, icon('right', 16)) : null,
            hasActions ? span({ class: 'w-8' }) : null,
          ]
        : undefined,
  })
  return hasActions ? withMore(kit, row, item, active, model.more) : row
}

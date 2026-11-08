import type { PaletteItem } from '../contract'
import type { ContextMenu, Kit } from '@sand/ui-kit/contract'
import { span, untrack, type MaybeReactive } from '@vaakx-dev/vrui'
import { actionsMenu } from './actions'
import type { PageModel } from './model'
import { wide } from './wide'

const lead = ({ icon, projectIcon, working }: Kit, item: PaletteItem) => {
  if (item.busy) return working(16)
  if (item.avatar) return projectIcon(item.avatar, item.avatarIcon)
  return item.icon ? icon(item.icon, 16) : undefined
}

export const rowView = (kit: Kit, item: PaletteItem, position: MaybeReactive<number>, model: PageModel, menu: ContextMenu) => {
  const { icon, listRow, optionProps } = kit
  const hasActions = Boolean(item.actions?.length)
  const { onMouseMove, onClick, ...option } = optionProps(model.box, position)
  return listRow({
    ...option,
    ...(hasActions ? menu.target(() => actionsMenu(item, model.runAction), onClick) : { onClick }),
    ...(item.disabled ? {} : { onMouseMove }),
    disabled: item.disabled,
    surface: 'raised',
    touch: true,
    large: !untrack(() => wide.get()),
    ...(item.danger && { tone: 'danger' as const }),
    lead: lead(kit, item),
    title: item.label,
    meta: item.detail,
    trail:
      item.meta || item.page
        ? [item.meta ? span({ class: 'tabular-nums' }, item.meta) : null, item.page ? span({ class: 'inline-flex' }, icon('right', 16)) : null]
        : undefined,
  })
}

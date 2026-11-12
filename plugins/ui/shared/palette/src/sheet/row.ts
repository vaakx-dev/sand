import type { PaletteItem } from '../contract'
import type { ContextMenu, Kit } from '@sand/ui-kit/contract'
import { span, untrack, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
import { actionsMenu } from './actions'
import type { PageModel } from './model'
import { wide } from './wide'

const lead = ({ icon, projectIcon }: Kit, item: PaletteItem) => {
  if (item.avatar) return projectIcon(item.avatar, item.avatarIcon)
  return item.icon ? icon(item.icon, 16) : undefined
}

const workView = (kit: Kit, item: PaletteItem, props: Props<HTMLButtonElement>, large: boolean) =>
  kit.workRow({ ...props, surface: 'raised', large }, kit.workRowBody({ title: item.label, detail: item.detail, status: item.status, at: item.at, large }))

const listView = (kit: Kit, item: PaletteItem, props: Props<HTMLButtonElement>, large: boolean) =>
  kit.listRow({
    ...props,
    surface: 'raised',
    touch: true,
    large,
    ...(item.danger && { tone: 'danger' as const }),
    lead: lead(kit, item),
    title: item.label,
    meta: item.detail,
    trail:
      item.meta || item.page
        ? [item.meta ? span({ class: 'tabular-nums' }, item.meta) : null, item.page ? span({ class: 'inline-flex' }, kit.icon('right', 16)) : null]
        : undefined,
  })

export const rowView = (kit: Kit, item: PaletteItem, position: MaybeReactive<number>, model: PageModel, menu: ContextMenu) => {
  const hasActions = Boolean(item.actions?.length)
  const { onMouseMove, onClick, ...option } = kit.optionProps(model.box, position)
  const props = {
    ...option,
    ...(hasActions ? menu.target(() => actionsMenu(item, model.runAction), onClick) : { onClick }),
    ...(item.disabled ? {} : { onMouseMove }),
    disabled: item.disabled,
  }
  const large = !untrack(() => wide.get())
  return item.at === undefined ? listView(kit, item, props, large) : workView(kit, item, props, large)
}

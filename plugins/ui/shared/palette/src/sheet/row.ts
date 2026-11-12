import type { PaletteItem } from '../contract'
import type { ContextMenu, Kit } from '@sand/ui-kit/contract'
import type { Row } from '@sand/ui-shell/contract'
import { span, untrack, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
import { actionsMenu } from './actions'
import type { PageModel } from './model'
import { wide } from './wide'

const lead = ({ icon, projectIcon }: Kit, item: PaletteItem) => {
  if (item.avatar) return projectIcon(item.avatar, item.avatarIcon)
  return item.icon ? icon(item.icon, 16) : undefined
}

const workView = (kit: Kit, row: () => Row, props: Props<HTMLButtonElement>, large: boolean) => kit.workRow({ ...props, surface: 'raised', large }, kit.rowBody(row, { large }))

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
    trail: item.meta ? span({ class: 'tabular-nums' }, item.meta) : undefined,
    opens: Boolean(item.page),
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
  return item.row ? workView(kit, item.row, props, large) : listView(kit, item, props, large)
}

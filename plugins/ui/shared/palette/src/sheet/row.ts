import type { PaletteExcerpt, PaletteItem } from '../contract'
import type { ContextMenu, Kit } from '@sand/ui-kit/contract'
import type { Row } from '@sand/ui-shell/contract'
import { el, span, untrack, type Child, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
import { actionsMenu } from './actions'
import type { PageModel } from './model'
import { wide } from './wide'

const lead = ({ botFace, icon, projectIcon }: Kit, item: PaletteItem) => {
  if (item.avatar) return projectIcon(item.avatar, item.avatarIcon)
  if (item.face) return botFace(item.face.id, item.face.tint, 16)
  return item.icon ? icon(item.icon, 16) : undefined
}

const marked = ({ text, marks }: PaletteExcerpt): Child[] => {
  const parts: Child[] = []
  let last = 0
  for (const [start, end] of marks) {
    parts.push(text.slice(last, start), el('mark', { class: 'bg-accent-500/25 text-neutral-100' }, text.slice(start, end)))
    last = end
  }
  return [...parts, text.slice(last)]
}

const excerptView = (excerpt: PaletteExcerpt, large: boolean) => span({ class: large && 'line-clamp-2 whitespace-normal' }, ...marked(excerpt))

const workView = (kit: Kit, row: () => Row, props: Props<HTMLButtonElement>, large: boolean) => kit.workRow({ ...props, surface: 'raised', large }, kit.rowBody(row, { large }))

const lines = (kit: Kit, item: PaletteItem, large: boolean) => {
  const excerpt = item.excerpt && excerptView(item.excerpt, large)
  if (item.nested) return { lead: span({ class: 'w-4' }), title: null, meta: excerpt ?? item.label }
  return { lead: lead(kit, item), title: item.label, meta: excerpt ?? item.detail }
}

const listView = (kit: Kit, item: PaletteItem, props: Props<HTMLButtonElement>, large: boolean) =>
  kit.listRow({
    ...props,
    surface: 'raised',
    touch: true,
    large,
    ...(item.danger && { tone: 'danger' as const }),
    ...lines(kit, item, large),
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

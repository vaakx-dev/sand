import type { ContextMenu } from '@sand/ui-kit/contract'
import { button, derive, div, dynamicChild, list, show, span, type Sig } from '@vaakx-dev/vrui'
import type { GroupAction, NavItem, ShellGroup, ShellRow } from './contract'
import { monogramOf } from './marks'
import type { Model } from './model'

export interface ListedGroup {
  key: string
  group: ShellGroup
}

export interface RowLook {
  phone: boolean
}

export const activate = (model: Model, item: NavItem) => (item.to ? model.open(item.to) : item.run())

export const groupsOf = (model: Model) =>
  derive(() => model.sections.items.get().flatMap(section => section.groups().map(group => ({ key: `${section.id}/${group.id}`, group }))))

const rowMenu = (menu: ContextMenu, row: () => ShellRow, open: () => void) =>
  menu.target(() => {
    const actions = row().menu?.()
    return actions?.length ? { title: row().label, actions } : undefined
  }, open)

const navCurrent = (model: Model, item: Sig<NavItem>) => () => {
  const { to, current } = item.get()
  if (current) return current()
  return Boolean(to && model.isCurrent(to))
}

export const navRow = (model: Model, item: Sig<NavItem>, phone: boolean) => {
  const { countMark, dot, icon, navButton, shortcutHint } = model.kit
  const current = navCurrent(model, item)
  return navButton(
    {
      active: current,
      'aria-current': () => (current() ? 'page' : 'false'),
      size: phone ? 'lg' : 'md',
      class: 'group w-full shrink-0',
      onClick: () => activate(model, item.get()),
    },
    span({ class: 'inline-flex shrink-0 text-neutral-500 group-hover:text-neutral-100 group-aria-current:text-neutral-100' }, icon(item.get().icon)),
    span({ class: 'min-w-0 flex-1 truncate text-left' }, () => item.get().label),
    show(
      () => (item.get().count?.() ?? 0) > 0,
      () => countMark(() => item.get().count?.() ?? 0),
    ),
    show(
      () => item.get().dot?.() ?? false,
      () => dot('accent'),
    ),
    dynamicChild(
      () => (phone ? undefined : item.get().keys),
      keys => (keys ? shortcutHint(keys) : null),
    ),
  )
}

const footButton = (model: Model, item: Sig<NavItem>, phone: boolean) => {
  const { icon, iconButton, withDot } = model.kit
  const current = navCurrent(model, item)
  const { label } = item.get()
  return iconButton(
    {
      title: label,
      'aria-label': label,
      active: current,
      'aria-current': () => (current() ? 'page' : 'false'),
      class: phone && 'h-10 w-10',
      onClick: () => activate(model, item.get()),
    },
    withDot(icon(item.get().icon, phone ? 20 : 16), () => item.get().dot?.() ?? false),
  )
}

const navsAt = (model: Model, place: NavItem['place']) => derive(() => model.navs.items.get().filter(item => (item.place ?? 'top') === place))

export const navList = (model: Model, phone: boolean) =>
  list(
    navsAt(model, 'top'),
    item => item.id,
    item => navRow(model, item, phone),
    div({ class: 'flex flex-col gap-px' }),
  )

export const footRow = (model: Model, phone: boolean) =>
  div(
    { class: 'flex shrink-0 items-center gap-px pt-2' },
    list(
      navsAt(model, 'foot'),
      item => item.id,
      item => footButton(model, item, phone),
      div({ class: 'flex items-center gap-px' }),
    ),
    list(
      navsAt(model, 'foot-end'),
      item => item.id,
      item => footButton(model, item, phone),
      div({ class: 'ml-auto flex items-center gap-px' }),
    ),
  )

export const rowView = (model: Model, menu: ContextMenu, row: Sig<ShellRow>, look: RowLook) => {
  const { workRow, workRowBody, workStatus } = model.kit
  const current = () => model.isCurrent(row.get().to)
  return workRow(
    { current, large: look.phone, ...rowMenu(menu, () => row.get(), () => model.open(row.get().to)) },
    dynamicChild(row, shown =>
      workRowBody({
        title: shown.label,
        large: look.phone,
        ...(shown.mark && { mark: monogramOf(model.kit, shown.mark) }),
        end: shown.end ? span({ class: 'flex shrink-0 tabular-nums' }, model.kit.metaLine(shown.end)) : workStatus(shown.status, shown.at),
        ...(shown.place && { place: { label: shown.place.label, mark: shown.place.mark?.() } }),
        ...(shown.trail && { trail: shown.trail() }),
      }),
    ),
  )
}

const foldHeading = (model: Model, key: string, group: () => ShellGroup) => {
  const { icon, sectionHeading } = model.kit
  const open = () => model.foldOpen(key)
  return button(
    { type: 'button', class: 'group w-full text-left', 'aria-expanded': () => String(open()), onClick: () => model.toggleFold(key) },
    sectionHeading(
      span({ class: 'min-w-0 truncate group-hover:text-neutral-200' }, () => group().label),
      span({ class: 'tabular-nums text-neutral-600' }, () => String(group().rows.length)),
      span({ class: 'ml-auto inline-flex text-neutral-600 group-hover:text-neutral-200' }, dynamicChild(open, shown => icon(shown ? 'down' : 'right', 'sm'))),
    ),
  )
}

const foldAction = (model: Model, action: GroupAction) =>
  model.kit.navButton(
    { class: 'group w-full shrink-0', onClick: () => action.run() },
    span({ class: 'inline-flex shrink-0 text-neutral-500 group-hover:text-neutral-100' }, model.kit.icon(action.icon)),
    span({ class: 'min-w-0 flex-1 truncate text-left text-neutral-500 group-hover:text-neutral-100' }, action.label),
  )

const groupView = (model: Model, menu: ContextMenu, listed: Sig<ListedGroup>, look: RowLook) => {
  const { key, group } = listed.get()
  const action = group.action
  const shown = () => !listed.get().group.folded || model.foldOpen(key)
  return div(
    { class: 'flex flex-col' },
    group.folded
      ? foldHeading(model, key, () => listed.get().group)
      : model.kit.groupHeading(() => listed.get().group.label, action && { icon: action.icon, label: action.label, onClick: () => action.run() }),
    list(
      derive(() => (shown() ? listed.get().group.rows : [])),
      row => row.id,
      row => rowView(model, menu, row, look),
      div({ class: 'flex flex-col gap-px' }),
    ),
    group.folded && action ? show(shown, () => foldAction(model, action)) : null,
  )
}

export const groupList = (model: Model, menu: ContextMenu, look: RowLook) =>
  list(groupsOf(model), listed => listed.key, listed => groupView(model, menu, listed, look), div({ class: 'flex flex-col' }))

export const brandLook = 'px-2 pt-2 pb-3 font-semibold tracking-tight text-neutral-100'

import type { ContextMenu } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, list, nav, show, span, type Props, type Sig } from '@vaakx-dev/vrui'
import type { NavItem, ShellGroup, ShellRow } from './contract'
import { monogramOf, statusIcon } from './marks'
import type { Model } from './model'

export interface ListedGroup {
  key: string
  group: ShellGroup
}

export const activate = (model: Model, item: NavItem) => (item.to ? model.open(item.to) : item.run())

export const groupsOf = (model: Model) =>
  derive(() => model.sections.items.get().flatMap(section => section.groups().map(group => ({ key: `${section.id}/${group.id}`, group }))))

export const rowMenu = (menu: ContextMenu, row: () => ShellRow, open: () => void) =>
  menu.target(() => {
    const actions = row().menu?.()
    return actions?.length ? { title: row().label, actions } : undefined
  }, open)

const navRow = (model: Model, item: Sig<NavItem>) => {
  const { countMark, dot, icon, navButton } = model.kit
  const current = () => {
    const to = item.get().to
    return Boolean(to && model.isCurrent(to))
  }
  return navButton(
    { active: current, 'aria-current': () => (current() ? 'page' : 'false'), class: 'group w-full shrink-0', onClick: () => activate(model, item.get()) },
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
  )
}

const rowView = (model: Model, menu: ContextMenu, row: Sig<ShellRow>) => {
  const { navButton } = model.kit
  const current = () => model.isCurrent(row.get().to)
  const open = () => model.open(row.get().to)
  return navButton(
    { active: current, 'aria-current': () => (current() ? 'page' : 'false'), class: 'w-full shrink-0', ...rowMenu(menu, () => row.get(), open) },
    dynamicChild(
      () => row.get().mark,
      mark => (mark ? monogramOf(model.kit, mark) : null),
    ),
    span({ class: 'min-w-0 flex-1 truncate text-left' }, () => row.get().label),
    dynamicChild(
      () => row.get().status,
      status => (status ? statusIcon(model.kit, status) : null),
    ),
  )
}

const groupView = (model: Model, menu: ContextMenu, listed: Sig<ListedGroup>) => {
  const action = listed.get().group.action
  return div(
    { class: 'mt-4 flex flex-col' },
    model.kit.groupHeading(() => listed.get().group.label, action && { icon: action.icon, label: action.label, onClick: () => action.run() }),
    list(
      derive(() => listed.get().group.rows),
      row => row.id,
      row => rowView(model, menu, row),
      div({ class: 'flex flex-col gap-px' }),
    ),
  )
}

const navList = (model: Model, place: 'top' | 'foot', into: HTMLElement) =>
  list(
    derive(() => model.navs.items.get().filter(item => (item.place ?? 'top') === place)),
    item => item.id,
    item => navRow(model, item),
    into,
  )

export const sidebar = (model: Model, { class: extra, ...props }: Props<HTMLElement>) => {
  const menu = model.kit.contextMenu()
  return nav(
    { ...props, 'aria-label': 'Sidebar', class: ['flex h-full w-64 shrink-0 flex-col bg-neutral-950', extra] },
    div({ class: 'flex h-12 shrink-0 items-center px-4 text-sm font-semibold text-neutral-100' }, 'sand'),
    div(
      { class: 'flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-4' },
      navList(model, 'top', div({ class: 'flex flex-col gap-px' })),
      list(groupsOf(model), listed => listed.key, listed => groupView(model, menu, listed), div({ class: 'flex flex-col' })),
    ),
    navList(model, 'foot', div({ class: 'flex shrink-0 flex-col gap-px p-2' })),
    menu.view(),
  )
}

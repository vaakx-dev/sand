import type { ContextMenu, HeadingAction } from '@sand/ui-kit/contract'
import { button, derive, div, dynamicChild, list, show, span, type Sig } from '@vaakx-dev/vrui'
import type { Fold, GroupAction, MenuAction, NavItem, ShellGroup, ShellRow } from './contract'
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

interface Menued {
  label: string
  menu?(): MenuAction[]
}

const itemMenu = (menu: ContextMenu, item: () => Menued, open: () => void) =>
  menu.target(() => {
    const actions = item().menu?.()
    return actions?.length ? { title: item().label, actions } : undefined
  }, open)

const navCurrent = (model: Model, item: Sig<NavItem>) => () => {
  const { to, current } = item.get()
  if (current) return current()
  return Boolean(to && model.isCurrent(to))
}

export const brand = (model: Model, phone: boolean) =>
  div({ class: ['flex items-center gap-2 px-2 font-semibold tracking-tight text-neutral-100', phone ? 'pt-2 pb-3 text-lg' : 'pt-2 pb-3 text-base'] }, model.kit.appIcon(18), span({}, 'sand'))

const plainNav = (model: Model, item: Sig<NavItem>, phone: boolean) => {
  const { navButton, shortcutHint } = model.kit
  const current = navCurrent(model, item)
  const dot = () => item.get().dot?.() ?? false
  return navButton(
    {
      active: current,
      'aria-current': () => (current() ? 'page' : 'false'),
      size: phone ? 'lg' : 'md',
      class: 'group w-full shrink-0',
      onClick: () => activate(model, item.get()),
    },
    span({ class: 'inline-flex shrink-0 text-neutral-500 group-hover:text-neutral-100 group-aria-current:text-neutral-100' }, model.kit.withDot(model.kit.icon(item.get().icon), dot)),
    span({ class: 'min-w-0 flex-1 truncate text-left' }, () => item.get().label),
    dynamicChild(
      () => (phone ? undefined : item.get().keys),
      keys => (keys ? shortcutHint(keys) : null),
    ),
  )
}

const quietNav = (model: Model, item: Sig<NavItem>, phone: boolean) => {
  const { icon, navButton } = model.kit
  const current = navCurrent(model, item)
  return navButton(
    {
      active: current,
      'aria-current': () => (current() ? 'page' : 'false'),
      size: phone ? 'lg' : 'md',
      class: 'group w-full shrink-0',
      onClick: () => activate(model, item.get()),
    },
    span({ class: 'inline-flex shrink-0 text-neutral-400 group-hover:text-neutral-200 group-aria-current:text-neutral-100' }, icon(item.get().icon)),
    span({ class: 'min-w-0 flex-1 truncate text-left text-sm font-normal text-neutral-200 group-hover:text-neutral-100 group-aria-current:text-neutral-100' }, () => item.get().label),
  )
}

const fieldNav = (model: Model, item: Sig<NavItem>, phone: boolean) => {
  const { icon, navButton, shortcutHint } = model.kit
  const current = navCurrent(model, item)
  return navButton(
    {
      active: current,
      'aria-current': () => (current() ? 'page' : 'false'),
      size: phone ? 'lg' : 'md',
      class: 'group w-full shrink-0 text-neutral-500 hover:text-neutral-200',
      onClick: () => activate(model, item.get()),
    },
    span({ class: 'inline-flex shrink-0' }, icon(item.get().icon)),
    span({ class: 'min-w-0 flex-1 truncate text-left font-normal' }, () => item.get().label),
    dynamicChild(
      () => (phone ? undefined : item.get().keys),
      keys => (keys ? shortcutHint(keys) : null),
    ),
  )
}

const alertButton = (model: Model, item: Sig<NavItem>, phone: boolean) => {
  const { dot, navButton, shortcutHint } = model.kit
  const current = navCurrent(model, item)
  const summary = () => item.get().summary?.() ?? `${item.get().count?.() ?? 0} ${item.get().label}`
  return navButton(
    {
      active: current,
      'aria-current': () => (current() ? 'page' : 'false'),
      size: phone ? 'lg' : 'md',
      class: 'group w-full shrink-0 bg-warning-950/60 hover:bg-warning-950',
      onClick: () => activate(model, item.get()),
    },
    span({ class: 'inline-flex shrink-0' }, dot('warning')),
    span({ class: 'shrink-0 font-semibold whitespace-nowrap text-neutral-100' }, summary),
    dynamicChild(
      () => item.get().detail?.(),
      detail => (detail ? span({ class: 'min-w-0 flex-1 truncate text-left font-normal text-neutral-400' }, () => `· ${item.get().detail?.() ?? ''}`) : null),
    ),
    dynamicChild(
      () => (phone ? undefined : item.get().keys),
      keys => (keys ? shortcutHint(keys) : null),
    ),
  )
}

const alertNav = (model: Model, item: Sig<NavItem>, phone: boolean) =>
  dynamicChild(
    () => (item.get().count?.() ?? 0) > 0,
    some => (some ? alertButton(model, item, phone) : fieldNav(model, item, phone)),
  )

export const navRow = (model: Model, item: Sig<NavItem>, phone: boolean) => {
  const look = item.get().look ?? 'row'
  if (look === 'field') return fieldNav(model, item, phone)
  if (look === 'alert') return alertNav(model, item, phone)
  return plainNav(model, item, phone)
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

export const quietNavList = (model: Model, phone: boolean) =>
  list(
    navsAt(model, 'nav'),
    item => item.id,
    item => quietNav(model, item, phone),
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

const offscreenRow = { contentVisibility: 'auto', containIntrinsicBlockSize: 'auto 44px' }

const rowView = (model: Model, menu: ContextMenu, row: () => ShellRow, look: RowLook) => {
  const { workRow, rowBody } = model.kit
  const current = () => model.isCurrent(row().to)
  return workRow({ current, large: look.phone, ...itemMenu(menu, row, () => model.open(row().to)) }, rowBody(row, { large: look.phone }))
}

const listedRow = (model: Model, menu: ContextMenu, row: () => ShellRow, look: RowLook) => div({ style: offscreenRow }, rowView(model, menu, row, look))

export const singleRow = (model: Model, row: () => ShellRow) => {
  const menu = model.kit.contextMenu()
  return div({ class: 'contents' }, dynamicChild(model.phone, phone => rowView(model, menu, row, { phone })), menu.view())
}

const workingCount = (group: ShellGroup) => group.rows.filter(row => row.status === 'running').length

const foldMark = (model: Model, group: () => ShellGroup, open: () => boolean) =>
  dynamicChild(
    () => group().icon?.(open()),
    name => (name ? span({ class: 'inline-flex shrink-0 text-neutral-600 group-hover:text-neutral-200' }, model.kit.icon(name, 'sm')) : null),
  )

const foldWorking = (model: Model, group: () => ShellGroup, open: () => boolean) =>
  dynamicChild(
    () => (open() ? 0 : workingCount(group())),
    count => (count ? model.kit.badge('run', model.kit.spinner('xs'), `${count} working`) : null),
  )

const foldHeading = (model: Model, menu: ContextMenu, key: string, fold: Fold, group: () => ShellGroup) => {
  const open = () => model.foldOpen(key, fold)
  return button(
    {
      type: 'button',
      class: 'group flex w-full min-w-0 items-center gap-2 px-2 pt-5 pb-1.5 text-left text-xs font-medium text-neutral-500',
      'aria-expanded': () => String(open()),
      ...itemMenu(menu, group, () => model.toggleFold(key)),
    },
    foldMark(model, group, open),
    span({ class: 'min-w-0 truncate group-hover:text-neutral-200' }, () => group().label),
    span({ class: 'tabular-nums text-neutral-600' }, () => String(group().rows.length)),
    foldWorking(model, group, open),
    span({ class: 'ml-auto inline-flex text-neutral-600 group-hover:text-neutral-200' }, dynamicChild(open, shown => model.kit.icon(shown ? 'down' : 'right', 'sm'))),
  )
}

const settledHeading = (label: () => string) =>
  div(
    { class: 'flex items-center gap-2 px-2 pt-4 pb-1 text-xs text-neutral-600' },
    span({ class: 'shrink-0' }, label),
    span({ class: 'h-px flex-1 bg-neutral-800' }),
  )

const headingAction = (menu: ContextMenu, title: () => string, action: GroupAction): HeadingAction => ({
  icon: action.icon,
  label: action.label,
  onClick: event => ('menu' in action ? menu.openBelow(event, () => ({ title: title(), actions: action.menu() })) : action.run()),
})

const foldAction = (model: Model, action: HeadingAction) =>
  model.kit.navButton(
    { class: 'group w-full shrink-0', onClick: action.onClick },
    span({ class: 'inline-flex shrink-0 text-neutral-500 group-hover:text-neutral-100' }, model.kit.icon(action.icon)),
    span({ class: 'min-w-0 flex-1 truncate text-left text-neutral-500 group-hover:text-neutral-100' }, action.label),
  )

const groupView = (model: Model, menu: ContextMenu, listed: Sig<ListedGroup>, look: RowLook) => {
  const { key, group } = listed.get()
  const { fold } = group
  const action = group.action && headingAction(menu, () => listed.get().group.label, group.action)
  const shown = () => !fold || model.foldOpen(key, fold)
  return div(
    { class: ['flex flex-col', fold !== 'open' && 'mt-5 first:mt-0'] },
    fold
      ? foldHeading(model, menu, key, fold, () => listed.get().group)
      : group.settled
        ? settledHeading(() => listed.get().group.label)
        : model.kit.groupHeading(() => listed.get().group.label, action),
    list(
      derive(() => (shown() ? listed.get().group.rows : [])),
      row => row.id,
      row => listedRow(model, menu, () => row.get(), look),
      div({ class: 'flex flex-col gap-px' }),
    ),
    show(
      () => shown() && !listed.get().group.rows.length && Boolean(listed.get().group.empty),
      () => div({ class: 'px-2' }, model.kit.emptyState({ text: () => listed.get().group.empty })),
    ),
    fold && action ? show(shown, () => foldAction(model, action)) : null,
  )
}

export const groupList = (model: Model, menu: ContextMenu, look: RowLook) =>
  list(groupsOf(model), listed => listed.key, listed => groupView(model, menu, listed, look), div({ class: 'flex flex-col' }))

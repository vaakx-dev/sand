import type { ContextMenu } from '@sand/ui-kit/contract'
import { button, derive, div, dynamicChild, list, show, span, type Sig } from '@vaakx-dev/vrui'
import type { GroupAction, NavItem, ShellGroup, ShellRow } from './contract'
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

const alertNav = (model: Model, item: Sig<NavItem>, phone: boolean) => {
  const { dot, navButton, shortcutHint } = model.kit
  const current = navCurrent(model, item)
  const summary = () => item.get().summary?.() ?? `${item.get().count?.() ?? 0} ${item.get().label}`
  return show(
    () => (item.get().count?.() ?? 0) > 0,
    () =>
      navButton(
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
      ),
  )
}

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

const sameLook = (shown: ShellRow, next: ShellRow) =>
  shown.label === next.label &&
  shown.end === next.end &&
  shown.at === next.at &&
  shown.status === next.status &&
  shown.lead === next.lead &&
  shown.detail === next.detail &&
  shown.trail === next.trail &&
  shown.place?.label === next.place?.label &&
  shown.place?.mark === next.place?.mark

const looksOf = (row: () => ShellRow) => {
  let shown: ShellRow | undefined
  return derive(() => {
    const next = row()
    if (!shown || !sameLook(shown, next)) shown = next
    return shown
  })
}

const rowView = (model: Model, menu: ContextMenu, row: () => ShellRow, look: RowLook) => {
  const { workRow, workRowBody } = model.kit
  const current = () => model.isCurrent(row().to)
  return workRow(
    { current, large: look.phone, ...rowMenu(menu, row, () => model.open(row().to)) },
    dynamicChild(looksOf(row), shown =>
      workRowBody({
        title: shown.label,
        large: look.phone,
        lead: shown.lead?.(),
        end: shown.end ? span({ class: 'flex shrink-0 tabular-nums' }, model.kit.metaLine(shown.end)) : undefined,
        at: shown.at,
        detail: shown.detail?.(),
        place: shown.place && { label: shown.place.label, mark: shown.place.mark?.() },
        status: shown.status,
        trail: shown.trail?.(),
      }),
    ),
  )
}

export const singleRow = (model: Model, row: () => ShellRow) => {
  const menu = model.kit.contextMenu()
  return div({ class: 'contents' }, dynamicChild(model.phone, phone => rowView(model, menu, row, { phone })), menu.view())
}

const foldHeading = (model: Model, key: string, group: () => ShellGroup) => {
  const open = () => model.foldOpen(key)
  return button(
    { type: 'button', class: 'group flex w-full min-w-0 items-center gap-2 px-2 pt-5 pb-1.5 text-left text-xs font-medium text-neutral-500', 'aria-expanded': () => String(open()), onClick: () => model.toggleFold(key) },
    span({ class: 'min-w-0 truncate group-hover:text-neutral-200' }, () => group().label),
    span({ class: 'tabular-nums text-neutral-600' }, () => String(group().rows.length)),
    span({ class: 'ml-auto inline-flex text-neutral-600 group-hover:text-neutral-200' }, dynamicChild(open, shown => model.kit.icon(shown ? 'down' : 'right', 'sm'))),
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
      row => rowView(model, menu, () => row.get(), look),
      div({ class: 'flex flex-col gap-px' }),
    ),
    show(
      () => !listed.get().group.rows.length && Boolean(listed.get().group.empty),
      () => div({ class: 'px-2' }, model.kit.emptyState({ text: () => listed.get().group.empty })),
    ),
    group.folded && action ? show(shown, () => foldAction(model, action)) : null,
  )
}

export const groupList = (model: Model, menu: ContextMenu, look: RowLook) =>
  list(groupsOf(model), listed => listed.key, listed => groupView(model, menu, listed, look), div({ class: 'flex flex-col gap-5' }))

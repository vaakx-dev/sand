import { clock, derive, div, dynamicChild, h1, list, span, type Sig } from '@vaakx-dev/vrui'
import type { ContextMenu } from '@sand/ui-kit/contract'
import type { NavItem, ShellRow } from './contract'
import { bar } from './frames'
import { age, monogramOf, statusIcon, statusName, urgent } from './marks'
import type { Model } from './model'
import { activate, groupsOf, rowMenu, type ListedGroup } from './sidebar'

const navButton = (model: Model, item: Sig<NavItem>) => {
  const { icon, iconButton, withDot } = model.kit
  const { label } = item.get()
  return iconButton(
    { title: label, 'aria-label': label, onClick: () => activate(model, item.get()) },
    withDot(icon(item.get().icon), () => item.get().dot?.() ?? false),
  )
}

const trail = (model: Model, row: ShellRow, now: () => number) => {
  const { status, at } = row
  if (status && urgent(status)) return [statusIcon(model.kit, status), span({ class: 'text-neutral-100' }, statusName(status))]
  return [status ? statusIcon(model.kit, status) : null, at === undefined ? null : span({ class: 'tabular-nums' }, () => age(now() - at))]
}

const rowView = (model: Model, menu: ContextMenu, row: Sig<ShellRow>, now: () => number) =>
  div(
    { class: 'contents' },
    dynamicChild(row, shown =>
      model.kit.listRow({
        title: [shown.label, shown.meta ? span({ class: 'ml-2 text-xs text-neutral-500' }, shown.meta) : null],
        meta: shown.detail,
        lead: shown.mark ? monogramOf(model.kit, shown.mark) : undefined,
        trail: trail(model, shown, now),
        ...rowMenu(menu, () => row.get(), () => model.open(row.get().to)),
      }),
    ),
  )

const groupView = (model: Model, menu: ContextMenu, listed: Sig<ListedGroup>, now: () => number) => {
  const action = listed.get().group.action
  return div(
    { class: 'mt-3 flex flex-col first:mt-0' },
    model.kit.groupHeading(() => listed.get().group.label, action && { icon: action.icon, label: action.label, onClick: () => action.run() }),
    list(
      derive(() => listed.get().group.rows),
      row => row.id,
      row => rowView(model, menu, row, now),
      div({ class: 'flex flex-col' }),
    ),
  )
}

export const homeScreen = (model: Model) => {
  const menu = model.kit.contextMenu()
  const now = clock(60_000)
  return div(
    { class: 'flex min-h-0 flex-1 flex-col' },
    bar(
      h1({ class: 'ml-2 min-w-0 flex-1 truncate text-base font-semibold text-neutral-100' }, 'sand'),
      list(
        derive(() => model.navs.items.get().filter(item => item.phone !== false)),
        item => item.id,
        item => navButton(model, item),
        div({ class: 'flex shrink-0 items-center gap-1' }),
      ),
    ),
    list(groupsOf(model), listed => listed.key, listed => groupView(model, menu, listed, () => now.get()), div({ class: 'flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-2 py-2' })),
    list(
      model.places.home.items,
      placed => placed.view,
      placed => placed.get().view,
      div({ class: 'flex shrink-0 flex-col' }),
    ),
    menu.view(),
  )
}

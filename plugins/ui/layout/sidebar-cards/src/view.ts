import type { NavAction } from '@sand/protocol'
import type { ContextMenu, Kit } from '@sand/ui-kit/contract'
import { clock, derive, div, list, show, sig, span, type Sig } from '@vaakx-dev/vrui'
import { actionMenu, type CardMenu } from './card/menu'
import { filterButton, filterChip, filterMenu, type FilterParts } from './project/view'
import type { CardRow, Row } from './rows/build'
import { rowView, type RowHandlers } from './rows/view'

export interface SidebarParts extends FilterParts {
  narrow: Sig<boolean>
  actions: Sig<NavAction[]>
  rows: Sig<Row[]>
  hide(): void
  run(action: NavAction): void
  busy(id: string): boolean
  pick(row: CardRow): void
  toggle: RowHandlers['toggle']
  more: RowHandlers['more']
  drag: RowHandlers['drag']
  menu: Sig<CardMenu | undefined>
}

const wideAction = ({ navActionIcon, navButton }: Kit, action: Sig<NavAction>, parts: SidebarParts) =>
  navButton(
    { class: 'flex-1', onClick: () => parts.run(action.get()) },
    navActionIcon(action, parts.busy),
    span({ class: 'min-w-0 flex-1 truncate text-left' }, action.map(value => value.label)),
  )

const iconAction = ({ iconButton, navActionIcon }: Kit, action: Sig<NavAction>, parts: SidebarParts) =>
  iconButton(
    {
      title: action.map(value => value.label),
      'aria-label': action.map(value => value.label),
      'aria-busy': () => parts.busy(action.get().id),
      onClick: () => parts.run(action.get()),
    },
    navActionIcon(action, parts.busy),
  )

const iconActions = (kit: Kit, actions: Sig<NavAction[]>, parts: SidebarParts, container: HTMLElement) =>
  list(
    actions,
    action => action.id,
    action => iconAction(kit, action, parts),
    container,
  )

const topActions = (kit: Kit, parts: SidebarParts, context: ContextMenu) => {
  const top = derive(() => parts.actions.get().filter(action => action.place !== 'footer'))
  const filtering = sig(false)
  return div(
    { class: 'relative flex shrink-0 items-center gap-1 px-2 pb-2' },
    list(
      derive(() => top.get().filter(action => action.wide)),
      action => action.id,
      action => wideAction(kit, action, parts),
      div({ class: 'flex min-w-0 flex-1' }),
    ),
    filterButton(kit, parts, filtering),
    iconActions(
      kit,
      derive(() => top.get().filter(action => !action.wide)),
      parts,
      div({ class: 'flex shrink-0 items-center gap-1' }),
    ),
    filterMenu(kit, parts, filtering, context),
  )
}

const footerActions = (kit: Kit, parts: SidebarParts) => {
  const footer = derive(() => parts.actions.get().filter(action => action.place === 'footer'))
  return div(
    { class: () => (footer.get().length ? 'flex shrink-0 items-center gap-1 px-2 pt-1 pb-2' : 'hidden') },
    iconActions(
      kit,
      derive(() => footer.get().filter(action => !action.end)),
      parts,
      div({ class: 'flex flex-1 items-center gap-1' }),
    ),
    iconActions(
      kit,
      derive(() => footer.get().filter(action => action.end)),
      parts,
      div({ class: 'flex items-center gap-1' }),
    ),
  )
}

const threadRows = (kit: Kit, parts: SidebarParts) => {
  const { hint } = kit
  const handlers: RowHandlers = { minute: clock(60_000), pick: parts.pick, toggle: parts.toggle, more: parts.more, drag: parts.drag, menu: request => parts.menu.set(request) }
  return div(
    { class: 'min-h-0 flex-1 overflow-auto overscroll-contain px-2 pb-3' },
    list(parts.rows, row => row.key, row => rowView(kit, row, handlers)),
    show(
      () => !parts.rows.get().length,
      () => hint(() => (parts.project.get() ? `No threads in ${parts.label.get()} yet` : 'No threads yet')),
    ),
  )
}

export const sidebarView = (kit: Kit, parts: SidebarParts) => {
  const { contextMenu, sideHead } = kit
  const context = contextMenu()
  return div(
    { class: () => ['relative flex h-full min-h-0 flex-col bg-neutral-950', parts.narrow.get() ? 'w-full' : 'w-64'] },
    sideHead('Sand', parts.hide),
    topActions(kit, parts, context),
    filterChip(kit, parts, context),
    threadRows(kit, parts),
    footerActions(kit, parts),
    actionMenu(kit, parts.menu, () => parts.menu.set(undefined)),
    context.view(),
  )
}

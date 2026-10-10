import type { NavAction } from '@sand/dom'
import {
  clock,
  derive,
  div,
  dynamicChild,
  el,
  icon,
  iconButton,
  list,
  navActionIcon,
  navButton,
  popover,
  popoverItem,
  projectIcon,
  show,
  sidebarToggle,
  sig,
  span,
  type Sig,
} from '@sand/dom'
import type { CardRow } from './card'
import { actionMenu, type MenuRequest } from './menu/view'
import type { ProjectChoice } from './project-choices'
import type { Row } from './rows'
import { rowView, type RowHandlers } from './rows-view'

const wideAction = (action: Sig<NavAction>, parts: SidebarParts) =>
  navButton(
    {
      class: 'flex-1',
      onClick: () => parts.run(action.get()),
    },
    navActionIcon(action, parts.busy),
    span({ class: 'min-w-0 flex-1 truncate text-left' }, action.map(value => value.label)),
  )

const iconAction = (action: Sig<NavAction>, parts: SidebarParts) =>
  iconButton(
    {
      title: action.map(value => value.label),
      'aria-label': action.map(value => value.label),
      'aria-busy': () => parts.busy(action.get().id),
      onClick: () => parts.run(action.get()),
    },
    navActionIcon(action, parts.busy),
  )

export interface SidebarParts {
  narrow: Sig<boolean>
  actions: Sig<NavAction[]>
  rows: Sig<Row[]>
  projects: Sig<ProjectChoice[]>
  project: Sig<string>
  label: Sig<string>
  filter(project: string | undefined): void
  hide(): void
  run(action: NavAction): void
  busy(id: string): boolean
  pick(row: CardRow): void
  toggle: RowHandlers['toggle']
  more: RowHandlers['more']
  drag: RowHandlers['drag']
  menu: Sig<MenuRequest | undefined>
}

const filterButton = (parts: SidebarParts, open: Sig<boolean>) =>
  iconButton(
    {
      title: () => (parts.project.get() ? `Showing ${parts.label.get()}` : 'Filter by project'),
      'aria-label': 'Filter by project',
      active: () => open.get() || Boolean(parts.project.get()),
      onClick: () => open.set(!open.get()),
    },
    icon('folder'),
  )

const filterMenu = (parts: SidebarParts, open: Sig<boolean>) => {
  const close = () => open.set(false)
  const choose = (project: string | undefined) => {
    parts.filter(project)
    close()
  }
  return show(open, () =>
    popover(
      close,
      { class: 'left-2 right-2 max-h-80 overflow-auto', style: { top: '100%' } },
      popoverItem({ active: !parts.project.get(), onClick: () => choose(undefined) }, 'All projects'),
      ...parts.projects.get().map(({ key, name, icon: url, count }) =>
        popoverItem(
          { active: parts.project.get() === key, onClick: () => choose(key) },
          projectIcon(name, url),
          span({ class: 'min-w-0 flex-1 truncate' }, name),
          count ? span({ class: 'shrink-0 text-xs tabular-nums text-neutral-500' }, String(count)) : null,
        ),
      ),
    ),
  )
}

const filterChip = (parts: SidebarParts) =>
  show(
    parts.project.map(Boolean),
    () =>
      div(
        { class: 'relative mx-2 mb-1 flex h-8 items-center gap-2 rounded-lg bg-neutral-900 pr-1 pl-3 text-xs text-neutral-300' },
        dynamicChild(parts.label, name => projectIcon(name, parts.projects.get().find(choice => choice.key === parts.project.get())?.icon)),
        span({ class: 'min-w-0 flex-1 truncate' }, parts.label),
        iconButton({ size: 'sm', title: 'Show all projects', onClick: () => parts.filter(undefined) }, icon('x', 14)),
      ),
  )

export const sidebarView = (parts: SidebarParts) => {
  const handlers: RowHandlers = { minute: clock(60_000), pick: parts.pick, toggle: parts.toggle, more: parts.more, drag: parts.drag, menu: request => parts.menu.set(request) }
  const top = derive(() => parts.actions.get().filter(action => action.place !== 'footer'))
  const wide = derive(() => top.get().filter(action => action.wide))
  const compact = derive(() => top.get().filter(action => !action.wide))
  const footer = derive(() => parts.actions.get().filter(action => action.place === 'footer' && !action.end))
  const footerEnd = derive(() => parts.actions.get().filter(action => action.place === 'footer' && action.end))
  const filtering = sig(false)
  return div(
    { class: () => ['relative flex h-full min-h-0 flex-col bg-neutral-950', parts.narrow.get() ? 'w-full' : 'w-64'] },
    div(
      { class: 'relative flex h-12 shrink-0 items-center px-2 text-neutral-400' },
      sidebarToggle({ title: 'Hide the sidebar', 'aria-label': 'Hide the sidebar', onClick: parts.hide }),
      el('b', { class: 'text-middle text-sm font-semibold text-neutral-300' }, 'sand'),
    ),
    div(
      { class: 'relative flex shrink-0 items-center gap-1 px-2 pb-2' },
      list(wide, action => action.id, action => wideAction(action, parts), div({ class: 'flex min-w-0 flex-1' })),
      filterButton(parts, filtering),
      list(compact, action => action.id, action => iconAction(action, parts), div({ class: 'flex shrink-0 items-center gap-1' })),
      filterMenu(parts, filtering),
    ),
    filterChip(parts),
    div(
      { class: 'min-h-0 flex-1 overflow-auto overscroll-contain px-2 pb-3' },
      list(parts.rows, row => row.key, row => rowView(row, handlers)),
      show(
        parts.rows.map(rows => !rows.length),
        () => div({ class: 'px-3 py-4 text-xs text-neutral-500' }, () => (parts.project.get() ? `No threads in ${parts.label.get()} yet.` : 'No threads yet.')),
      ),
    ),
    div(
      { class: () => (footer.get().length || footerEnd.get().length ? 'flex shrink-0 items-center gap-1 px-2 pt-1 pb-2' : 'hidden') },
      list(footer, action => action.id, action => iconAction(action, parts), div({ class: 'flex flex-1 items-center gap-1' })),
      list(footerEnd, action => action.id, action => iconAction(action, parts), div({ class: 'flex items-center gap-1' })),
    ),
    actionMenu(parts.menu, () => parts.menu.set(undefined)),
  )
}

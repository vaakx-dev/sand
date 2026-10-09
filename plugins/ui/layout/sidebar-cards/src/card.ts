import type { NavAction, NavItem, NavList } from '@sand/protocol'
import { ago, color, derive, div, dot, dynamicChild, elapsed, exactTime, focusable, icon, iconButton, intent, keys, navStatus, projectIcon, show, span, stopThen, tildeHome, working, type Reorder, type Sig } from '@sand/dom'

export type CardRow = { group: string; list: NavList; item: NavItem; selected: boolean }

const kindOf = (value: NavItem) => (value.state === 'running' || value.state === 'background' || value.state === 'waiting' || value.state === 'draft' ? value.state : value.unread ? 'unread' : '')

const agents = (count: number) => `${count} agent${count === 1 ? '' : 's'}`

const startedTitle = (at?: number) => (at ? `Started ${exactTime(at)}` : 'Working')

const status = (item: Sig<NavItem>, minute: Sig<number>) =>
  dynamicChild(item.map(kindOf), kind => {
    if (kind === 'running') {
      const title = item.map(value => startedTitle(value.started))
      return span(
        { class: 'inline-flex items-center gap-1 font-medium text-accent-400', title },
        working(14, title),
        'Working',
        span({ class: 'font-normal' }, elapsed(item.map(value => value.started))),
      )
    }
    if (kind === 'background') {
      const title = item.map(value => navStatus(value))
      return span(
        { class: 'inline-flex items-center gap-1 font-medium text-sky-400', title },
        icon('bot', 14),
        item.map(value => agents(value.jobs ?? 1)),
        span({ class: 'font-normal' }, elapsed(item.map(value => value.started))),
      )
    }
    if (kind === 'waiting') return span({ class: 'inline-flex items-center gap-1' }, dot('warning'), span({ class: 'font-medium text-warning-400' }, 'Needs you'))
    if (kind === 'draft') return span({ class: 'inline-flex items-center gap-1 font-medium text-sky-400' }, icon('pencil', 11), 'Draft')
    if (kind === 'unread') return span({ class: 'text-orange-400', title: navStatus(item.get()) }, '✦ new')
    const age = derive(() => {
      minute.get()
      return ago(item.get().updated)
    })
    return span({ class: 'tabular-nums text-neutral-500', title: () => exactTime(item.get().updated) }, age)
  })

const actionStrip = (actions: NavAction[], reveal: string) =>
  span(
    { class: ['hidden items-center gap-1', reveal] },
    actions.map(action => iconButton({ size: 'sm', title: action.label, 'aria-label': action.label, onClick: stopThen(() => action.run()) }, icon(action.icon ?? 'right', 13))),
  )

const draftEdge = () => span({ class: 'pointer-events-none absolute inset-0 rounded-lg', style: { boxShadow: `inset 2px 0 0 ${color('sky', 400)}` } })

const slotOf = ({ group, list, item }: CardRow) => ({ id: item.id, group, movable: Boolean(list.move && item.movable) })

export const card = (row: Sig<CardRow>, minute: Sig<number>, pick: (row: CardRow) => void, drag: Reorder) => {
  const item = row.map(value => value.item)
  const selected = row.map(value => value.selected)
  const project = item.map(value => value.project ?? value.subtitle ?? '')
  const menu = row.map(value => value.list.menu?.(value.item.id) ?? [])
  const menuKey = menu.map(actions => actions.map(action => `${action.id}:${action.label}:${action.icon}`).join('|'))
  const strong = () => selected.get() || item.get().unread || item.get().state === 'waiting'

  return div(
    {
      role: 'button',
      tabIndex: 0,
      'aria-current': selected,
      class: [
        focusable,
        'group relative mb-1 block w-full rounded-lg px-3 py-2 transition',
        () => (selected.get() ? 'bg-neutral-700' : 'hover:bg-neutral-800'),
      ],
      onClick: () => pick(row.get()),
      onKeyDown: keys({ Enter: () => pick(row.get()), ' ': () => pick(row.get()) }, { self: true, repeat: false }),
      ...intent(() => row.get().list.prefetch?.(row.get().item.id)),
      ...drag(() => slotOf(row.get())),
    },
    show(
      item.map(value => value.state === 'draft'),
      draftEdge,
    ),
    div(
      { class: 'flex h-5 items-center gap-2 text-xs text-neutral-400' },
      dynamicChild(
        item.map(value => value.icon ?? ''),
        url => (url ? projectIcon('', url) : dynamicChild(project, projectIcon)),
      ),
      span({ class: 'min-w-0 flex-1 truncate', title: project }, project),
      show(
        item.map(value => Boolean(value.pinned)),
        () => span({ class: 'inline-flex text-neutral-500', title: 'Pinned' }, icon('pin', 12)),
      ),
      span({ class: 'flex shrink-0 items-center group-hover:hidden' }, status(item, minute)),
      dynamicChild(menuKey, () => actionStrip(menu.get(), 'group-hover:flex')),
    ),
    div(
      {
        class: [
          'truncate text-sm',
          () => (strong() ? 'font-semibold text-neutral-100' : item.get().settled ? 'text-neutral-500' : 'text-neutral-400'),
        ],
        title: item.map(value => value.title),
      },
      item.map(value => value.title),
    ),
    div(
      { class: 'flex h-5 items-center gap-2 text-xs text-neutral-500' },
      span({ class: 'flex min-w-0 flex-1 items-center gap-1', title: item.map(value => tildeHome(value.path ?? '')) }, icon('folder', 11), span({ class: 'truncate' }, item.map(value => value.subtitle ?? ''))),
      dynamicChild(menuKey, () => actionStrip(menu.get(), 'touch-current:flex')),
    ),
  )
}

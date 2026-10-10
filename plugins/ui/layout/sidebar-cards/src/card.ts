import type { NavAction, NavItem, NavList } from '@sand/dom'
import { color, div, dynamicChild, focusable, icon, intent, keys, pressMenu, projectIcon, show, sig, span, tildeHome, type Reorder, type Sig } from '@sand/dom'
import type { MenuRequest } from './menu/view'
import { status } from './status'
import { actionStrip, type StripParts } from './strip'

export type CardRow = { group: string; list: NavList; item: NavItem; selected: boolean }

const draftEdge = () => span({ class: 'pointer-events-none absolute inset-0 rounded-lg', style: { boxShadow: `inset 2px 0 0 ${color('sky', 400)}` } })

const slotOf = ({ group, list, item }: CardRow) => ({ id: item.id, group, movable: Boolean(list.move && item.movable) })

interface CardParts {
  item: Sig<NavItem>
  selected: Sig<boolean>
  project: Sig<string>
  minute: Sig<number>
  strip: StripParts
}

const strong = ({ item, selected }: CardParts) => selected.get() || item.get().unread || item.get().state === 'waiting'

const avatar = ({ item, project }: CardParts) =>
  dynamicChild(
    item.map(value => value.icon ?? ''),
    url => (url ? projectIcon('', url) : dynamicChild(project, projectIcon)),
  )

const statusSlot = (parts: CardParts, extra = '') =>
  span({ class: () => (parts.strip.choosing.get() ? 'hidden' : ['flex shrink-0 items-center group-hover:hidden', extra]) }, status(parts.item, parts.minute))

const fullBody = (parts: CardParts) => {
  const { item, project } = parts
  return div(
    div(
      { class: 'flex h-5 items-center gap-2 text-xs text-neutral-400' },
      avatar(parts),
      span({ class: 'min-w-0 flex-1 truncate', title: project }, project),
      show(
        item.map(value => Boolean(value.pinned)),
        () => span({ class: 'inline-flex text-neutral-500', title: 'Pinned' }, icon('pin', 12)),
      ),
      statusSlot(parts),
      actionStrip(parts.strip, 'group-hover:flex', true),
    ),
    div(
      { class: ['truncate text-sm', () => (strong(parts) ? 'font-semibold text-neutral-100' : 'text-neutral-400')], title: item.map(value => value.title) },
      item.map(value => value.title),
    ),
    div(
      { class: ['h-5 items-center gap-2 text-xs text-neutral-500', () => (item.get().subtitle ? 'flex' : 'hidden touch-current:flex')] },
      span(
        { class: 'flex min-w-0 flex-1 items-center gap-1', title: item.map(value => tildeHome(value.path ?? '')) },
        dynamicChild(
          item.map(value => value.subtitleIcon ?? 'folder'),
          name => icon(name, 11),
        ),
        span({ class: 'truncate' }, item.map(value => value.subtitle ?? '')),
      ),
      actionStrip(parts.strip, 'touch-current:flex', false),
    ),
  )
}

const compactTitle = (value: NavItem) => [value.title, [value.project, tildeHome(value.path ?? '')].filter(Boolean).join(' · ')].filter(Boolean).join('\n')

const compactBody = (parts: CardParts) => {
  const { item } = parts
  return div(
    { class: 'flex h-5 items-center gap-2', title: item.map(compactTitle) },
    span({ class: 'inline-flex shrink-0' }, avatar(parts)),
    span({ class: ['min-w-0 flex-1 truncate text-sm', () => (strong(parts) ? 'font-semibold text-neutral-100' : 'text-neutral-400')] }, item.map(value => value.title)),
    statusSlot(parts, 'text-xs'),
    actionStrip(parts.strip, 'group-hover:flex touch-current:flex', true),
  )
}

const pointBelow = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  const box = target.getBoundingClientRect()
  return { x: box.left, y: box.bottom + 4, from: (target.closest('[role="button"]') as HTMLElement | null) ?? target }
}

const touched = (event: MouseEvent) => (event as PointerEvent).pointerType === 'touch'

export const card = (row: Sig<CardRow>, minute: Sig<number>, pick: (row: CardRow) => void, drag: Reorder, openMenu: (request: MenuRequest) => void) => {
  const item = row.map(value => value.item)
  const selected = row.map(value => value.selected)
  const compact = item.map(value => Boolean(value.settled || value.snoozed))
  const menu = row.map(value => value.list.menu?.(value.item.id) ?? [])
  const choosing = sig<string | undefined>(undefined)
  const strip: StripParts = {
    menu,
    menuKey: menu.map(actions => actions.map(action => `${action.id}:${action.label}:${action.icon}`).join('|')),
    choosing,
    expand(action: NavAction, event: MouseEvent, inline: boolean) {
      if (inline && !touched(event)) return choosing.set(action.id)
      openMenu({ ...pointBelow(event), touch: true, row: row.get(), expand: action.id })
    },
    ask(action: NavAction, event: MouseEvent) {
      openMenu({ ...pointBelow(event), touch: touched(event), row: row.get(), ask: action.id })
    },
  }
  const parts: CardParts = { item, selected, project: item.map(value => value.project ?? value.subtitle ?? ''), minute, strip }
  const press = pressMenu(at => {
    if (menu.get().length) openMenu({ ...at, row: row.get() })
  })
  const dragging = drag(() => slotOf(row.get()))
  const hover = intent(() => row.get().list.prefetch?.(row.get().item.id))

  return div(
    {
      role: 'button',
      tabIndex: 0,
      'aria-current': selected,
      'aria-haspopup': menu.map(actions => (actions.length ? 'menu' : undefined)),
      class: [
        focusable,
        'group relative block w-full select-none rounded-lg px-3 transition',
        () => (compact.get() ? 'mb-px py-1' : 'mb-1 py-2'),
        () => (selected.get() ? 'bg-neutral-700' : 'hover:bg-neutral-800'),
        () => (compact.get() && !selected.get() ? 'opacity-50 hover:opacity-100 focus-visible:opacity-100' : ''),
      ],
      onClick: () => press.held() || pick(row.get()),
      onKeyDown: keys({ Enter: () => pick(row.get()), ' ': () => pick(row.get()) }, { self: true, repeat: false }),
      ...hover,
      onPointerLeave: () => {
        hover.onPointerLeave()
        choosing.set(undefined)
      },
      ...dragging,
      ...press.props,
      style: { ...dragging.style, '-webkit-touch-callout': 'none' },
    },
    show(
      item.map(value => value.state === 'draft'),
      draftEdge,
    ),
    dynamicChild(compact, small => (small ? compactBody(parts) : fullBody(parts))),
  )
}

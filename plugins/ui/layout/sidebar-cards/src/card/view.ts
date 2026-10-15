import { tildeHome } from '@sand/kit'
import { intent, pressMenu, type Reorder } from '@sand/kit/web'
import type { NavAction, NavItem } from '@sand/protocol'
import type { Kit } from '@sand/ui-kit/contract'
import { colorVar, div, dynamicChild, keys, show, sig, span, type Sig } from '@vaakx-dev/vrui'
import type { CardRow } from '../rows/build'
import { creatorBadge } from './creator'
import type { CardMenu } from './menu'
import { status } from './status'
import { actionStrip, type StripParts } from './strip'

const draftEdge = () => span({ class: 'pointer-events-none absolute inset-0 rounded-lg', style: { boxShadow: `inset 2px 0 0 ${colorVar('sky', 400)}` } })

const slotOf = ({ group, list, item }: CardRow) => ({ id: item.id, group, movable: Boolean(list.move && item.movable) })

interface CardParts {
  kit: Kit
  item: Sig<NavItem>
  selected: Sig<boolean>
  project: Sig<string>
  minute: Sig<number>
  strip: StripParts
}

const strong = ({ item, selected }: CardParts) => selected.get() || item.get().unread || item.get().state === 'waiting'

const titleClass = (parts: CardParts) => (strong(parts) ? 'font-semibold text-neutral-100' : 'text-neutral-400')

const avatar = ({ kit: { projectAvatar }, item, project }: CardParts) => projectAvatar(project, item.map(value => value.icon))

const onHover = 'group-hover:flex group-focus-visible-within:flex'

const onTouchCurrent = ({ selected }: CardParts) => (selected.get() ? 'touch:flex' : '')

const offTouchCurrent = ({ selected }: CardParts) => (selected.get() ? 'touch:hidden' : '')

const statusSlot = (parts: CardParts, extra = '') =>
  span(
    {
      class: () =>
        parts.strip.choosing.get() ? 'hidden' : ['flex shrink-0 items-center group-hover:hidden group-focus-visible-within:hidden', offTouchCurrent(parts), extra],
    },
    status(parts.kit, parts.item, parts.minute),
  )

const actions = (parts: CardParts) => actionStrip(parts.kit, parts.strip, [onHover, () => onTouchCurrent(parts)])

const fullBody = (parts: CardParts) => {
  const { kit, item, project } = parts
  const { icon } = kit
  return div(
    div(
      { class: 'flex h-5 items-center gap-1.5 text-xs text-neutral-400' },
      avatar(parts),
      span({ class: 'min-w-0 flex-1 truncate', title: project }, project),
      creatorBadge(kit, item),
      show(
        item.map(value => Boolean(value.pinned)),
        () => span({ class: 'inline-flex text-neutral-500', title: 'Pinned' }, icon('pin', 12)),
      ),
      statusSlot(parts),
      actions(parts),
    ),
    div({ class: ['truncate text-sm', () => titleClass(parts)], title: item.map(value => value.title) }, item.map(value => value.title)),
    show(
      item.map(value => Boolean(value.subtitle)),
      () =>
        div(
          { class: 'flex h-5 items-center gap-1 text-xs text-neutral-500', title: item.map(value => tildeHome(value.path ?? '')) },
          dynamicChild(
            item.map(value => value.subtitleIcon ?? 'folder'),
            name => icon(name, 12),
          ),
          span({ class: 'truncate' }, item.map(value => value.subtitle ?? '')),
        ),
    ),
  )
}

const compactTitle = (value: NavItem) => [value.title, [value.project, tildeHome(value.path ?? '')].filter(Boolean).join(' · ')].filter(Boolean).join('\n')

const compactBody = (parts: CardParts) =>
  div(
    { class: 'flex h-5 items-center gap-1.5', title: parts.item.map(compactTitle) },
    span({ class: 'inline-flex shrink-0' }, avatar(parts)),
    span({ class: ['min-w-0 flex-1 truncate text-sm', () => titleClass(parts)] }, parts.item.map(value => value.title)),
    creatorBadge(parts.kit, parts.item),
    statusSlot(parts, 'text-xs'),
    actions(parts),
  )

const pointBelow = (event: MouseEvent) => {
  const button = event.currentTarget as HTMLElement
  const box = button.getBoundingClientRect()
  return { x: box.left, y: box.bottom + 4, from: button.closest<HTMLElement>('[role="button"]') ?? button }
}

const touched = (event: MouseEvent) => event instanceof PointerEvent && event.pointerType === 'touch'

export const card = (kit: Kit, row: Sig<CardRow>, minute: Sig<number>, pick: (row: CardRow) => void, drag: Reorder, openMenu: (request: CardMenu) => void) => {
  const item = row.map(value => value.item)
  const selected = row.map(value => value.selected)
  const compact = item.map(value => Boolean(value.settled || value.snoozed))
  const menu = row.map(value => value.list.menu?.(value.item.id) ?? [])
  const choosing = sig<string | undefined>(undefined)
  const strip: StripParts = {
    menu,
    menuKey: menu.map(actions => actions.map(action => `${action.id}:${action.label}:${action.icon}`).join('|')),
    choosing,
    expand(action: NavAction, event: MouseEvent) {
      if (!touched(event)) return choosing.set(action.id)
      openMenu({ ...pointBelow(event), touch: true, row: row.get(), expand: action.id })
    },
    ask(action: NavAction, event: MouseEvent) {
      openMenu({ ...pointBelow(event), touch: touched(event), row: row.get(), ask: action.id })
    },
  }
  const parts: CardParts = { kit, item, selected, project: item.map(value => value.project ?? value.subtitle ?? ''), minute, strip }
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
        'group relative block w-full cursor-pointer select-none callout-none rounded-lg px-3 outline-none transition focus-visible:ring-2 focus-visible:ring-accent-500',
        () => (compact.get() ? 'mb-px py-1' : 'mb-1 py-2'),
        () => (selected.get() ? 'bg-neutral-700' : 'hover:bg-neutral-800'),
        () => (compact.get() && !selected.get() ? 'opacity-50 hover:opacity-100 focus-visible:opacity-100' : ''),
      ],
      onClick: () => press.held() || pick(row.get()),
      onKeyDown: keys({ Enter: () => pick(row.get()), ' ': () => pick(row.get()) }, { self: true, repeat: false }),
      ...hover,
      ...dragging,
      ...press.props,
    },
    show(
      item.map(value => value.state === 'draft'),
      draftEdge,
    ),
    dynamicChild(compact, small => (small ? compactBody(parts) : fullBody(parts))),
  )
}

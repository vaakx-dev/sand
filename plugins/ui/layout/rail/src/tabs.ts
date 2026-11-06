import type { Kit } from '@sand/ui-kit/contract'
import { div, list, nav, show, span } from '@vaakx-dev/vrui'
import type { RailAction } from './contract'
import type { RailParts } from './parts'
import { focusRing, spaceLink, spaceList, spaceMark, type Look } from './space'

const look: Look = active => [
  'flex min-w-0 flex-1 flex-col items-center gap-1 pt-2 pb-1.5 text-xs transition-colors',
  active ? 'text-accent-400' : 'text-neutral-400',
]

const marked = (action: RailAction) => (action.count?.() ?? 0) > 0 || (action.dot?.() ?? false)

const moreTab = (kit: Kit, parts: RailParts) => {
  const context = kit.contextMenu()
  const active = () => parts.lit.get().size > 0
  const button: HTMLElement = kit.plainButton(
    {
      class: () => [focusRing, look(active())],
      'aria-current': () => (active() ? 'page' : 'false'),
      onClick: (event: MouseEvent) => context.open({ x: event.clientX, y: event.clientY, touch: true, from: button, title: 'More', actions: parts.actions.get() }),
    },
    kit.withDot(kit.icon('more', 20), () => parts.actions.get().some(marked)),
    span({ class: 'max-w-full truncate' }, 'More'),
  )
  return div({ class: 'flex min-w-0 flex-1' }, button, context.view())
}

export const railTabs = (kit: Kit, parts: RailParts) =>
  nav(
    { 'aria-label': 'Spaces', class: 'flex shrink-0 border-t border-neutral-800 bg-neutral-950 pb-safe' },
    list(
      spaceList(parts),
      space => space.id,
      space => spaceLink(space, parts, look, () => [spaceMark(kit, space), span({ class: 'max-w-full truncate' }, space.map(value => value.label))]),
      div({ class: 'contents' }),
    ),
    show(
      () => parts.actions.get().length > 0,
      () => moreTab(kit, parts),
    ),
  )

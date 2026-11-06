import type { Kit } from '@sand/ui-kit/contract'
import { div, list, nav, show, span, type Sig } from '@vaakx-dev/vrui'
import type { RailAction } from './contract'
import type { RailParts } from './parts'
import { focusRing, spaceLink, spaceList, spaceMark, type Look } from './space'

const look: Look = active => [
  'relative flex h-10 w-10 items-center justify-center rounded-md transition-colors',
  active ? 'bg-neutral-800 text-accent-400' : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100',
]

const activeBar = () => span({ class: 'absolute inset-y-2 -left-1 w-1 rounded-full bg-accent-500' })

const actionButton = ({ navActionIcon, plainButton }: Kit, action: Sig<RailAction>, parts: RailParts) => {
  const active = () => parts.lit.get().has(action.get().id)
  return plainButton(
    {
      class: () => [focusRing, look(active())],
      title: action.map(value => value.label),
      'aria-label': action.map(value => value.label),
      'aria-current': () => (active() ? 'page' : 'false'),
      'aria-busy': () => parts.busy(action.get().id),
      onClick: () => parts.run(action.get()),
    },
    show(active, activeBar),
    navActionIcon(action, parts.busy, 20),
  )
}

export const railColumn = (kit: Kit, parts: RailParts) =>
  nav(
    { 'aria-label': 'Spaces', class: 'flex min-h-0 w-12 flex-1 flex-col items-center border-r border-neutral-800 bg-neutral-950 py-2' },
    span({ class: 'mb-2 inline-flex h-10 w-10 items-center justify-center' }, kit.appIcon(20)),
    list(
      spaceList(parts),
      space => space.id,
      space =>
        spaceLink(space, parts, look, active => [
          show(active, activeBar),
          spaceMark(kit, space),
          span({ class: 'sr-only' }, space.map(value => value.label)),
        ]),
      div({ class: 'flex flex-col items-center gap-1' }),
    ),
    div({ class: 'flex-1' }),
    list(
      parts.actions,
      action => action.id,
      action => actionButton(kit, action, parts),
      div({ class: 'flex flex-col items-center gap-1' }),
    ),
  )

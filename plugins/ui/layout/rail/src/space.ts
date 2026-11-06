import type { Space } from '@sand/layout/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { a, derive, dynamicChild, show, span, type Child, type ClassValue, type Sig } from '@vaakx-dev/vrui'
import type { RailParts } from './parts'

export type Look = (active: boolean) => ClassValue

export const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-accent-500'

const browserHandles = (event: MouseEvent) => event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey

const countBadge = (count: () => number) =>
  span(
    {
      'aria-hidden': 'true',
      class: 'absolute -top-1.5 -right-3 min-w-4 rounded-full bg-accent-500 px-1 text-center text-xs leading-4 font-medium text-accent-950 tabular-nums',
    },
    () => (count() > 99 ? '99+' : String(count())),
  )

export const spaceList = ({ spaces }: RailParts) => derive(() => spaces.list())

export const spaceMark = ({ dot, icon }: Kit, space: Sig<Space>) => {
  const count = () => space.get().count?.() ?? 0
  const attention = () => count() === 0 && (space.get().attention?.() ?? false)
  return span(
    { class: 'relative inline-flex' },
    dynamicChild(
      space.map(value => value.icon),
      name => icon(name, 20),
    ),
    show(() => count() > 0, () => countBadge(count)),
    show(attention, () => span({ class: 'absolute -top-1 -right-1 flex' }, dot('accent'))),
  )
}

export const spaceLink = (space: Sig<Space>, { spaces, lit }: RailParts, look: Look, children: (active: () => boolean) => Child[]) => {
  const active = () => spaces.active() === space.get().id && lit.get().size === 0
  return a(
    {
      href: space.map(value => `?space=${encodeURIComponent(value.id)}`),
      'aria-current': () => (active() ? 'page' : 'false'),
      title: space.map(value => value.label),
      class: () => ['no-underline', focusRing, look(active())],
      onClick: (event: MouseEvent) => {
        if (browserHandles(event)) return
        event.preventDefault()
        spaces.open(space.get().id)
      },
    },
    ...children(active),
  )
}

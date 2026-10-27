import type { NavAction } from '@sand/nav/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, keys, sig, type Sig } from '@vaakx-dev/vrui'
import type { CardRow } from '../rows/build'
import type { Reorder } from '../rows/reorder'
import { cardBody, type CardParts } from './body'
import { intent } from './intent'
import type { CardMenu } from './menu'
import type { StripParts } from './strip'

export interface CardHandlers {
  minute: Sig<number>
  drag: Reorder
  pick(row: CardRow): void
  prefetch(id: string): void
  menuOf(id: string): NavAction[]
  menu(request: CardMenu): void
}

const slotOf = ({ group, item }: CardRow) => ({ id: item.id, group, movable: Boolean(item.movable) })

const pointBelow = (event: MouseEvent) => {
  const button = event.currentTarget as HTMLElement
  const box = button.getBoundingClientRect()
  return { x: box.left, y: box.bottom + 4, from: button.closest<HTMLElement>('[role="button"]') ?? button }
}

const touched = (event: MouseEvent) => event instanceof PointerEvent && event.pointerType === 'touch'

export const card = (kit: Kit, row: Sig<CardRow>, handlers: CardHandlers) => {
  const item = row.map(value => value.item)
  const selected = row.map(value => value.selected)
  const compact = item.map(value => Boolean(value.settled || value.snoozed))
  const menu = row.map(value => handlers.menuOf(value.item.id))
  const choosing = sig<string | undefined>(undefined)
  const strip: StripParts = {
    menu,
    menuKey: menu.map(found => found.map(action => `${action.id}:${action.label}:${action.icon}`).join('|')),
    choosing,
    expand(action: NavAction, event: MouseEvent) {
      if (!touched(event)) return choosing.set(action.id)
      handlers.menu({ ...pointBelow(event), touch: true, row: row.get(), expand: action.id })
    },
    ask(action: NavAction, event: MouseEvent) {
      handlers.menu({ ...pointBelow(event), touch: touched(event), row: row.get(), ask: action.id })
    },
  }
  const parts: CardParts = { kit, item, selected, mixed: row.map(value => value.mixed), minute: handlers.minute, strip }
  const press = kit.pressMenu(at => {
    if (menu.get().length) handlers.menu({ ...at, row: row.get() })
  })
  const dragging = handlers.drag(() => slotOf(row.get()))
  const hover = intent(() => handlers.prefetch(row.get().item.id))

  return div(
    {
      role: 'button',
      tabIndex: 0,
      'aria-current': selected,
      'aria-haspopup': menu.map(found => (found.length ? 'menu' : undefined)),
      class: [
        'group relative block w-full cursor-pointer select-none callout-none rounded-md px-3 outline-none transition-colors hover:bg-neutral-800 aria-current:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-accent-500',
        () => (compact.get() ? 'py-1.5' : 'mb-1 py-2'),
      ],
      onClick: () => press.held() || handlers.pick(row.get()),
      onKeyDown: keys({ Enter: () => handlers.pick(row.get()), ' ': () => handlers.pick(row.get()) }, { self: true, repeat: false }),
      ...hover,
      ...dragging,
      ...press.props,
    },
    dynamicChild(compact, small => cardBody(parts, small)),
  )
}

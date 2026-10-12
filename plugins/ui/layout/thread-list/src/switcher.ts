import { navItems } from '@sand/kit'
import type { Pulse } from '@sand/kit/web'
import type { NavList } from '@sand/protocol'
import type { Kit } from '@sand/ui-kit/contract'
import { span } from '@vaakx-dev/vrui'

const titleOf = (nav: NavList, id: string) => navItems(nav).find(item => item.id === id)?.title ?? 'New thread'

export const switcher = (kit: Kit, nav: NavList, changes: Pulse, create: () => void) => {
  const { choiceItem, dropdown, icon, navButton, navMark, paneHead } = kit
  const current = changes.read(() => {
    const selected = nav.selected?.() ?? ''
    return navItems(nav).some(item => item.id === selected) ? selected : ''
  })
  const label = changes.read(() => titleOf(nav, current.get()))
  const row = (id: string, close: () => void, ...children: (HTMLElement | string | null)[]) =>
    choiceItem(
      {
        icon: id ? undefined : 'compose',
        selected: () => current.get() === id,
        onClick: () => {
          close()
          if (id) nav.select(id)
          else create()
        },
      },
      ...children,
    )

  return paneHead(
    { class: 'bg-neutral-950' },
    span({ class: 'shrink-0 text-xs text-neutral-400' }, 'Thread'),
    dropdown({
      menuClass: 'w-80 max-w-full max-h-96 overflow-auto',
      trigger: (press, open) =>
        navButton(
          { active: open, class: 'max-w-sm', 'aria-label': 'Thread', ...press },
          span({ class: 'min-w-0 truncate text-neutral-100' }, label),
          span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon('down', 14)),
        ),
      items: close => [
        row('', close, span({ class: 'min-w-0 flex-1 truncate' }, 'New thread')),
        ...navItems(nav).map(item => row(item.id, close, navMark(item), span({ class: 'min-w-0 flex-1 truncate' }, item.title))),
      ],
    }),
  )
}

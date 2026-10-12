import type { NavItem, NavList } from '@sand/dom'
import { choiceItem, dropdown, icon, navButton, navItems, paneHead, span, stateMark, working, type Pulse } from '@sand/dom'

const mark = (item: NavItem) => {
  if (item.state === 'draft') return stateMark('draft')
  if (item.state === 'running') return working()
  if (item.state === 'background') return stateMark('agent')
  return item.unread ? stateMark('unread') : null
}

const titleOf = (nav: NavList, id: string) => navItems(nav).find(item => item.id === id)?.title ?? 'New thread'

export const switcher = (nav: NavList, changes: Pulse, create: () => void) => {
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
        ...navItems(nav).map(item => row(item.id, close, mark(item), span({ class: 'min-w-0 flex-1 truncate' }, item.title))),
      ],
    }),
  )
}

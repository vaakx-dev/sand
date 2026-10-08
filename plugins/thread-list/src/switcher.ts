import type { NavItem, NavList } from '@sand/protocol'
import { div, effect, list, navItems, option, select, sig, type Pulse, type Sig } from '@sand/dom'

const fresh = { id: '', title: 'New thread' } as const

const mark = (item: NavItem) => (item.state === 'draft' ? 'Draft · ' : item.state === 'running' || item.state === 'background' ? '◌ ' : item.unread ? '✦ ' : '')

const label = (item: NavItem | typeof fresh) => ('state' in item ? `${mark(item)}${item.title}` : item.title)

export const switcher = (nav: NavList, changes: Pulse, create: () => void) => {
  const items = changes.read(() => [fresh, ...navItems(nav)])
  const current = changes.read(() => {
    const selected = nav.selected?.() ?? ''
    return items.get().some(item => item.id === selected) ? selected : ''
  })
  const choice = sig(current.get())
  effect(() => choice.set(current.get()))

  const showCurrent = () => {
    choice.set('')
    choice.set(current.get())
  }

  const pick = () => {
    if (field.value) return nav.select(field.value)
    showCurrent()
    create()
  }

  const field = select(
    { class: 'max-w-sm rounded-md bg-neutral-800 px-2 py-1 text-xs text-neutral-100', bindValue: choice, onChange: pick },
    list(items, item => item.id, (item: Sig<NavItem | typeof fresh>) => option({ value: item.get().id }, item.map(label))),
  )

  return div({ class: 'flex h-10 items-center gap-2 bg-neutral-950 px-4 text-xs text-neutral-400' }, 'Thread', field)
}

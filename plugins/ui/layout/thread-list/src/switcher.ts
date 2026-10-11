import type { NavItem, NavList } from '@sand/dom'
import { div, effect, list, navItems, option, select, sig, type Pulse } from '@sand/dom'

const mark = (item: NavItem) => {
  if (item.state === 'draft') return 'Draft · '
  if (item.state === 'running' || item.state === 'background') return '◌ '
  return item.unread ? '✦ ' : ''
}

const choices = (nav: NavList) => [{ id: '', label: 'New thread' }, ...navItems(nav).map(item => ({ id: item.id, label: `${mark(item)}${item.title}` }))]

export const switcher = (nav: NavList, changes: Pulse, create: () => void) => {
  const items = changes.read(() => choices(nav))
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

  const field = select({ class: 'max-w-sm rounded-md bg-neutral-800 px-2 py-1 text-xs text-neutral-100', 'aria-label': 'Thread', bindValue: choice, onChange: pick })

  return div(
    { class: 'flex h-10 items-center gap-2 bg-neutral-950 px-4 text-xs text-neutral-400' },
    'Thread',
    list(
      items,
      item => item.id,
      item => option({ value: item.get().id, selected: () => item.get().id === choice.get() }, item.map(entry => entry.label)),
      field,
    ),
  )
}

import type { NavAction, NavItem } from '@sand/protocol'
import { button, dot, dynamicChild, effect, icon, iconButton, intent, navActionIcon, navSlot, navTip, projectIcon, span, working, type NavEntry, type Reorder, type Sig } from '@sand/dom'

const mark = (item: NavItem) => {
  if (item.state === 'running') return working()
  if (item.state === 'background') return span({ class: 'inline-flex shrink-0 text-sky-400' }, icon('bot', 12))
  if (item.state === 'waiting') return dot('warning')
  if (item.unread) return dot('orange')
  if (item.state === 'draft') return span({ class: 'inline-flex shrink-0 text-sky-400' }, icon('pencil', 12))
  return projectIcon(item.project ?? item.title, item.icon)
}

export const tabButton = (entry: Sig<NavEntry>, drag: Reorder) => {
  const item = entry.map(value => value.item)
  const node = button(
    {
      type: 'button',
      class: () => [
        'inline-flex h-8 max-w-40 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-xs md:max-w-48',
        entry.get().selected ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-300',
      ],
      title: item.map(navTip),
      onClick: () => entry.get().pick(),
      ...intent(() => entry.get().list.prefetch?.(entry.get().item.id)),
      ...drag(() => navSlot(entry.get())),
    },
    dynamicChild(
      item.map(value => `${value.state}|${value.unread}|${value.project ?? value.title}`),
      () => mark(item.get()),
    ),
    span({ class: () => ['truncate', item.get().unread ? 'font-semibold text-neutral-100' : ''] }, item.map(value => value.title)),
  )
  effect(() => {
    if (entry.get().selected) node.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  })
  return node
}

interface ActionHost {
  run(action: NavAction): void
  busy(id: string): boolean
}

export const actionIcon = (action: Sig<NavAction>, host: ActionHost) =>
  iconButton({ title: action.map(value => value.label), onClick: () => host.run(action.get()) }, navActionIcon(action, host.busy))

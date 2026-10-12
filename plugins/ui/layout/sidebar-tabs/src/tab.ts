import type { NavAction, NavItem } from '@sand/dom'
import { dot, dynamicChild, effect, iconButton, intent, navActionIcon, navSlot, navTip, projectIcon, quietButton, span, stateMark, working, type NavEntry, type Reorder, type Sig } from '@sand/dom'

const mark = (item: NavItem) => {
  if (item.state === 'running') return working()
  if (item.state === 'background') return stateMark('agent')
  if (item.state === 'waiting') return dot('warning')
  if (item.unread) return stateMark('unread')
  if (item.state === 'draft') return stateMark('draft')
  return projectIcon(item.project ?? item.title, item.icon)
}

export const tabButton = (entry: Sig<NavEntry>, drag: Reorder) => {
  const item = entry.map(value => value.item)
  const node = quietButton(
    {
      active: () => entry.get().selected,
      class: 'max-w-40 md:max-w-48',
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
  iconButton(
    {
      title: action.map(value => value.label),
      'aria-label': action.map(value => value.label),
      'aria-busy': () => host.busy(action.get().id),
      onClick: () => host.run(action.get()),
    },
    navActionIcon(action, host.busy),
  )

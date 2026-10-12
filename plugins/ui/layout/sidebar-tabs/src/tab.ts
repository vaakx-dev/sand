import { navTip } from '@sand/kit'
import { intent, type NavEntries } from '@sand/kit/web'
import type { NavHost } from '@sand/nav/contract'
import type { NavAction, NavEntry, NavItem } from '@sand/protocol'
import type { Kit } from '@sand/ui-kit/contract'
import { dynamicChild, effect, span, type Sig } from '@vaakx-dev/vrui'

const mark = ({ navMark, projectIcon }: Kit, item: NavItem) => navMark(item) ?? projectIcon(item.project ?? item.title, item.icon)

export const tabButton = (kit: Kit, entry: Sig<NavEntry>, drag: NavEntries['drag']) => {
  const { quietButton } = kit
  const item = entry.map(value => value.item)
  const node = quietButton(
    {
      active: () => entry.get().selected,
      class: 'max-w-40 md:max-w-48',
      title: item.map(navTip),
      onClick: () => entry.get().pick(),
      ...intent(() => entry.get().list.prefetch?.(entry.get().item.id)),
      ...drag(() => entry.get()),
    },
    dynamicChild(
      item.map(value => `${value.state}|${value.unread}|${value.project ?? value.title}`),
      () => mark(kit, item.get()),
    ),
    span({ class: () => ['truncate', item.get().unread ? 'font-semibold text-neutral-100' : ''] }, item.map(value => value.title)),
  )
  effect(() => {
    if (entry.get().selected) node.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  })
  return node
}

export const actionIcon = ({ iconButton, navActionIcon }: Kit, action: Sig<NavAction>, host: NavHost) =>
  iconButton(
    {
      title: action.map(value => value.label),
      'aria-label': action.map(value => value.label),
      'aria-busy': () => host.busy(action.get().id),
      onClick: () => host.run(action.get()),
    },
    navActionIcon(action, host.busy),
  )

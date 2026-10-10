import { derive } from '@vaakx-dev/vrui'
import type { NavHost } from './host'
import { reorder } from './reorder'
import type { NavItem, NavList } from './types'

export interface NavEntry {
  key: string
  group: string
  movable: boolean
  list: NavList
  item: NavItem
  selected: boolean
  pick(): void
}

export interface NavEntriesOptions {
  axis: 'x' | 'y'
  onPick?(entry: NavEntry): void
}

export const navItems = (list: NavList) => {
  const selected = list.selected?.()
  const shown = list.items().filter(item => !(item.settled || item.snoozed) || item.id === selected)
  return [...shown.filter(item => item.pinned), ...shown.filter(item => !item.pinned)]
}

export const navSlot = ({ item, group, movable }: NavEntry) => ({ id: item.id, group, movable })

const entriesOf = (list: NavList, onPick: NavEntriesOptions['onPick']) => {
  const selected = list.selected?.()
  return navItems(list).map(item => {
    const entry: NavEntry = {
      key: `${list.id}:${item.id}`,
      group: `${list.id}:${item.pinned ? 'pinned' : 'rest'}`,
      movable: Boolean(list.move && item.movable),
      list,
      item,
      selected: item.id === selected,
      pick() {
        list.select(item.id)
        onPick?.(entry)
      },
    }
    return entry
  })
}

export const navEntries = (host: NavHost, { axis, onPick }: NavEntriesOptions) => {
  const entries = derive(() => host.lists.get().flatMap(list => entriesOf(list, onPick)))
  const grouped = (group: string) => entries.get().filter(entry => entry.group === group)
  const drag = reorder({
    axis,
    siblings: group => grouped(group).map(entry => entry.item.id),
    move: (group, id, above, below) => grouped(group)[0]?.list.move?.(id, above, below),
  })
  return { entries, drag }
}

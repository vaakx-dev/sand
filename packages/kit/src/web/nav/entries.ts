import type { NavEntry, NavList } from '@sand/protocol'
import { derive, type Derive } from '@vaakx-dev/vrui'
import { navItems } from '../../nav/items'
import { reorder } from '../reorder'

const entriesOf = (list: NavList) => {
  const selected = list.selected?.()
  return navItems(list).map(
    (item): NavEntry => ({
      key: `${list.id}:${item.id}`,
      group: `${list.id}:${item.pinned ? 'pinned' : 'rest'}`,
      movable: Boolean(list.move && item.movable),
      list,
      item,
      selected: item.id === selected,
      pick: () => list.select(item.id),
    }),
  )
}

export const navEntries = (nav: { lists: Derive<NavList[]> }, axis: 'x' | 'y') => {
  const entries = derive(() => nav.lists.get().flatMap(entriesOf))
  const grouped = (group: string) => entries.get().filter(entry => entry.group === group)
  const drag = reorder({
    axis,
    siblings: group => grouped(group).map(entry => entry.item.id),
    move: (group, id, above, below) => grouped(group)[0]?.list.move?.(id, above, below),
  })
  return {
    entries,
    drag: (entry: () => NavEntry) =>
      drag(() => {
        const { item, group, movable } = entry()
        return { id: item.id, group, movable }
      }),
  }
}

export type NavEntries = ReturnType<typeof navEntries>

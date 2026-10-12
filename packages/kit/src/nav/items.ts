import type { NavList } from '@sand/protocol'

export const navItems = (list: NavList) => {
  const selected = list.selected?.()
  const shown = list.items().filter(item => !(item.settled || item.snoozed) || item.id === selected)
  return [...shown.filter(item => item.pinned), ...shown.filter(item => !item.pinned)]
}

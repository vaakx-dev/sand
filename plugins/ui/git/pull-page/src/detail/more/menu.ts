import { byOrder } from '@sand/util'
import type { Child } from '@vaakx-dev/vrui'
import type { PullMenu } from '../../contract'
import type { Shown } from '../shown'
import { agentItems } from './agent'
import { githubItems } from './github'
import { linkItems } from './links'
import { stateItems } from './state'

interface Section {
  order: number
  items(close: () => void): Child[]
}

const builtIn = (shown: Shown): Section[] => [
  { order: 0, items: close => agentItems(shown, close) },
  { order: 10, items: close => githubItems(shown, close) },
  { order: 20, items: close => linkItems(shown, close) },
  { order: 30, items: close => stateItems(shown, close) },
]

const extended = (shown: Shown, menu: PullMenu): Section => ({
  order: menu.order ?? 0,
  items: close => menu.items({ pull: shown.pull(), close }),
})

const groups = (shown: Shown, close: () => void): Child[][] => {
  const sections = [...shown.parts.menus.entries.get().map(menu => extended(shown, menu)), ...builtIn(shown)].sort(byOrder)
  const rows = new Map<number, Child[]>()
  for (const section of sections) rows.set(section.order, [...(rows.get(section.order) ?? []), ...section.items(close)])
  return [...rows.values()]
}

export const moreMenu = (shown: Shown) => {
  const { kit } = shown.parts
  return kit.dropdown({
    placement: 'below-right',
    trigger: (press, open) => kit.iconButton({ ...press, size: 'sm', active: open, title: 'More actions', 'aria-label': 'More actions' }, kit.icon('more', 14)),
    items: close =>
      groups(shown, close)
        .filter(items => items.length)
        .flatMap((items, index) => (index ? [kit.menuSeparator(), ...items] : items)),
  })
}

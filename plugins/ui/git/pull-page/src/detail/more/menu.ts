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
  { order: 0, items: close => githubItems(shown, close) },
  { order: 10, items: close => agentItems(shown, close) },
  { order: 20, items: close => linkItems(shown, close) },
  { order: 30, items: close => stateItems(shown, close) },
]

const extended = (shown: Shown, menu: PullMenu): Section => ({
  order: menu.order ?? 0,
  items: close => menu.items({ pull: shown.pull(), close }),
})

const sections = (shown: Shown, close: () => void): Child[][] =>
  [...builtIn(shown), ...shown.parts.menus.entries.get().map(menu => extended(shown, menu))]
    .sort((a, b) => a.order - b.order)
    .map(section => section.items(close))

export const moreMenu = (shown: Shown) => {
  const { kit } = shown.parts
  return kit.dropdown({
    placement: 'below-right',
    menuClass: 'w-80',
    trigger: (press, open) => kit.iconButton({ ...press, active: open, title: 'More actions', 'aria-label': 'More actions' }, kit.icon('more')),
    items: close =>
      sections(shown, close)
        .filter(items => items.length)
        .flatMap((items, index) => (index ? [kit.menuSeparator(), ...items] : items)),
  })
}

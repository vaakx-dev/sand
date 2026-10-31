import type { Child } from '@vaakx-dev/vrui'
import type { Shown } from '../shown'
import { agentItems } from './agent'
import { githubItems } from './github'
import { linkItems } from './links'
import { stateItems } from './state'

const sections = (shown: Shown, close: () => void): Child[][] => [
  githubItems(shown, close),
  agentItems(shown, close),
  linkItems(shown, close),
  stateItems(shown, close),
]

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

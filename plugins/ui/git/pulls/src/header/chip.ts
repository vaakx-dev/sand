import type { PullLink } from '@sand/pull-links/contract'
import { dynamicChild, span } from '@vaakx-dev/vrui'
import type { PullParts } from '../parts'
import { attentionLook, pullName, pullTitle } from '../pull/look'

const chipButton = (parts: PullParts, link: PullLink) => {
  const { kit } = parts
  const look = attentionLook(link.summary)
  const show = () => {
    const at = parts.place.get()
    if (at) parts.open(link, at)
  }
  return kit.navButton(
    { title: pullTitle(link), 'aria-label': `Pull request ${pullName(link)}`, class: 'shrink-0', onClick: show },
    kit.badge(look.tone, kit.icon(look.icon, 14), pullName(link), look.short ? span({ class: 'hidden md:inline' }, look.short) : null),
  )
}

export const pullChip = (parts: PullParts) => dynamicChild(parts.primary, link => (link ? chipButton(parts, link) : null))

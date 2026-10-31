import { pullName } from '@sand/github/look'
import type { PullLink } from '@sand/pull-links/contract'
import type { RowDecoration } from '@sand/sidebar/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { span } from '@vaakx-dev/vrui'
import type { PullsContext } from '../inject'
import { primaryOf } from '../links/rank'
import { attentionLook, pullTitle } from '../pull/look'

const pullPill = (kit: Kit, link: PullLink) => span({ class: 'inline-flex shrink-0', title: pullTitle(link) }, kit.badge(attentionLook(link.summary).tone, pullName(link)))

export const pullDecoration = ({ kit, pullLinks }: PullsContext): RowDecoration => ({
  id: 'git-pulls',
  order: 40,
  badge(thread) {
    if (thread.draft) return null
    const link = primaryOf(pullLinks.of(thread.id))
    return link ? pullPill(kit, link) : null
  },
})

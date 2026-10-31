import { pullName } from '@sand/github/look'
import { arrangePulls, type PullArrangement, type PullLink } from '@sand/pull-links/contract'
import type { RowDecoration, SidebarThread } from '@sand/sidebar/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { button, span, stopThen } from '@vaakx-dev/vrui'
import type { ThreadPullsClient } from '../contract'
import type { PullsContext } from '../inject'
import { attentionLook, needsUser, pullTitle } from '../pull/look'
import { pullsCard } from './card'
import { hoverCard } from './hover'

const countLabel = ({ lines, stack }: PullArrangement) => (stack ? `Stack of ${lines.length} pull requests` : `${lines.length} pull requests`)

const pullMark = (kit: Kit, thread: SidebarThread, arrangement: PullArrangement, primary: PullLink, client: ThreadPullsClient) => {
  const links = arrangement.lines.map(line => line.link)
  const many = links.length > 1
  const shown = links.find(link => needsUser(link.summary)) ?? primary
  const look = attentionLook(shown.summary)
  const tint = kit.toneText[look.tone]
  const open = (link: PullLink) => client.open(link, { session: thread.id, cwd: thread.cwd, device: thread.device })
  const hover = hoverCard()
  const mark = button(
    {
      type: 'button',
      class: ['inline-flex shrink-0 items-center gap-1 rounded-sm text-xs tabular-nums', needsUser(shown.summary) ? tint : 'text-neutral-400 hover:text-neutral-100'],
      ...(many ? { ...hover.anchor, title: '', 'aria-label': countLabel(arrangement) } : { title: pullTitle(primary) }),
      onClick: stopThen(() => {
        hover.close()
        open(primary)
      }),
    },
    span({ class: ['inline-flex', tint] }, kit.icon(look.icon, 12)),
    many ? String(links.length) : pullName(primary),
  )
  return many ? [mark, pullsCard(kit, arrangement.lines, hover, open)] : mark
}

export const pullDecoration = ({ kit, pullLinks }: PullsContext, client: ThreadPullsClient): RowDecoration => ({
  id: 'git-pulls',
  order: 40,
  badge(thread) {
    if (thread.draft) return null
    const arrangement = arrangePulls(pullLinks.of(thread.id))
    return arrangement.primary ? pullMark(kit, thread, arrangement, arrangement.primary, client) : null
  },
})

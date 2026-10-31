import { pullName } from '@sand/github/look'
import type { PullLine, PullLink } from '@sand/pull-links/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, portal, sig, span } from '@vaakx-dev/vrui'
import { attentionLook } from '../pull/look'
import type { HoverAt, HoverCard } from './hover'

const margin = 8
const indents = ['', 'w-0', 'w-3', 'w-6']

const indentOf = (depth: number) => (depth ? span({ class: ['shrink-0', indents[Math.min(depth, indents.length - 1)]] }) : null)

const pullItem = (kit: Kit, { link, depth }: PullLine, pick: (link: PullLink) => void) => {
  const look = attentionLook(link.summary)
  return kit.menuItem(
    { title: look.short ?? look.label, onClick: () => pick(link) },
    indentOf(depth),
    span({ class: ['inline-flex shrink-0', kit.toneText[look.tone]] }, kit.icon(look.icon, 16)),
    span({ class: 'min-w-0 flex-1 truncate' }, link.summary?.title ?? pullName(link)),
    kit.menuReason(pullName(link)),
  )
}

const placed = (kit: Kit, start: HoverAt, hover: HoverCard, ...items: Node[]) => {
  const top = sig(start.y)
  const card = kit.popover(hover.close, { class: 'top-0 left-0 w-max max-w-80' }, ...items)
  return div(
    {
      ...hover.card,
      class: [kit.layer.menu, 'fixed'],
      style: { left: `${start.x}px`, top: () => `${top.get()}px` },
      onMount: () => {
        const { height } = card.getBoundingClientRect()
        if (start.y + height > innerHeight - margin) top.set(Math.max(margin, start.above - height))
      },
    },
    card,
  )
}

export const pullsCard = (kit: Kit, lines: PullLine[], hover: HoverCard, pick: (link: PullLink) => void) =>
  dynamicChild(hover.at, at =>
    at
      ? portal(
          document.body,
          placed(
            kit,
            at,
            hover,
            ...lines.map(line =>
              pullItem(kit, line, link => {
                hover.close()
                pick(link)
              }),
            ),
          ),
        )
      : null,
  )

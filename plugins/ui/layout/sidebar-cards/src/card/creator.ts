import type { NavItem } from '@sand/protocol'
import type { Kit } from '@sand/ui-kit/contract'
import { dynamicChild, stopThen, type Sig } from '@vaakx-dev/vrui'

export const creatorBadge = ({ icon, plainButton }: Kit, item: Sig<NavItem>) =>
  dynamicChild(
    item.map(value => value.creator),
    creator =>
      creator &&
      plainButton(
        {
          class: 'inline-flex shrink-0 rounded-sm text-sky-400 hover:text-sky-300',
          title: creator.label,
          'aria-label': creator.label,
          disabled: !creator.open,
          onClick: stopThen(() => creator.open?.()),
        },
        icon('bot', 12),
      ),
  )

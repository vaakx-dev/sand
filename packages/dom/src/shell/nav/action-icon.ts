import type { NavAction } from '@sand/protocol'
import { dynamicChild, span, type Sig } from '@vaakx-dev/vrui'
import { icon } from '../../icons/lucide'

export const navActionIcon = (action: Sig<NavAction>, busy: (id: string) => boolean, size?: number) =>
  span(
    { class: () => ['inline-flex shrink-0', busy(action.get().id) ? 'animate-spin' : ''] },
    dynamicChild(
      action.map(value => value.icon ?? 'right'),
      name => icon(name, size),
    ),
  )

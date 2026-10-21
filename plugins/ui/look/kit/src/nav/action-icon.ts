import type { NavAction } from '@sand/nav/contract'
import { derive, dynamicChild, type Sig } from '@vaakx-dev/vrui'
import { icon } from '../icons/lucide'
import { spinner, withDot } from '../marks/marks'

export const navActionIcon = (action: Sig<NavAction>, busy: (id: string) => boolean, size?: number) =>
  withDot(
    dynamicChild(
      derive(() => (busy(action.get().id) ? '' : (action.get().icon ?? 'right'))),
      name => (name ? icon(name, size) : spinner(size === 16 ? 16 : 14)),
    ),
    () => action.get().dot?.() ?? false,
  )

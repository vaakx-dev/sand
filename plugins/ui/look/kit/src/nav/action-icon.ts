import type { NavAction } from '@sand/nav/contract'
import { derive, dynamicChild, type Sig } from '@vaakx-dev/vrui'
import { icon, type IconSize } from '../icons/lucide'
import { spinner, withDot } from '../marks/marks'

const glyphOf = (action: NavAction, busy: boolean): string => (busy ? 'busy' : (action.icon ?? ''))

export const navActionIcon = (action: Sig<NavAction>, busy: (id: string) => boolean, size: IconSize = 'md') =>
  withDot(
    dynamicChild(
      derive(() => glyphOf(action.get(), busy(action.get().id))),
      name => {
        if (name === 'busy') return spinner(size)
        return name ? icon(name, size) : null
      },
    ),
    () => action.get().dot?.() ?? false,
  )

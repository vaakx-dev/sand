import { derive, dynamicChild, span, type Sig } from '@vaakx-dev/vrui'
import { spinner } from '../../components/marks'
import { icon } from '../../icons/lucide'
import type { NavAction } from './types'

export const navActionIcon = (action: Sig<NavAction>, busy: (id: string) => boolean, size?: number) =>
  span(
    { class: 'inline-flex shrink-0' },
    dynamicChild(
      derive(() => (busy(action.get().id) ? '' : (action.get().icon ?? 'right'))),
      name => (name ? icon(name, size) : spinner(size === 16 ? 16 : 14)),
    ),
  )

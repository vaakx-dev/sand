import type { NavAction } from '@sand/nav/contract'
import { derive, dynamicChild, span, type Sig } from '@vaakx-dev/vrui'
import { icon, type IconSize } from '../icons/lucide'
import { spinner, withDot } from '../marks/marks'

const glyphOf = (action: NavAction, busy: boolean): string => (busy ? 'busy' : (action.icon ?? ''))

export const navActionIcon = (action: Sig<NavAction>, busy: (id: string) => boolean, size: IconSize = 'md') => {
  const count = () => action.get().count?.() ?? 0
  const marked = () => count() > 0 || (action.get().dot?.() ?? false)
  const title = () => (count() > 0 ? `${action.get().label} · ${count()}` : action.get().label)
  return span(
    { class: 'inline-flex shrink-0', title },
    withDot(
      dynamicChild(
        derive(() => glyphOf(action.get(), busy(action.get().id))),
        name => {
          if (name === 'busy') return spinner(size)
          return name ? icon(name, size) : null
        },
      ),
      marked,
    ),
  )
}

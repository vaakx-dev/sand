import type { NavAction } from '@sand/nav/contract'
import { derive, dynamicChild, show, span, type Sig } from '@vaakx-dev/vrui'
import { icon, type IconSize } from '../icons/lucide'
import { spinner, withDot } from '../marks/marks'

const glyphOf = (action: NavAction, busy: boolean): string => (busy ? 'busy' : (action.icon ?? ''))

const countText = (count: number) => (count > 99 ? '99+' : String(count))

const withCount = (glyph: HTMLElement, count: () => number) =>
  span(
    { class: 'relative inline-flex shrink-0' },
    glyph,
    show(
      () => count() > 0,
      () =>
        span(
          { class: 'absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-xs font-medium text-accent-950 tabular-nums' },
          () => countText(count()),
        ),
    ),
  )

export const navActionIcon = (action: Sig<NavAction>, busy: (id: string) => boolean, size: IconSize = 'md') => {
  const count = () => action.get().count?.() ?? 0
  return withCount(
    withDot(
      dynamicChild(
        derive(() => glyphOf(action.get(), busy(action.get().id))),
        name => {
          if (name === 'busy') return spinner(size)
          return name ? icon(name, size) : null
        },
      ),
      () => count() === 0 && (action.get().dot?.() ?? false),
    ),
    count,
  )
}

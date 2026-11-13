import { div, span } from '@vaakx-dev/vrui'
import { limitBar, type Segment } from './bar'

export const windowRow = (label: string, segments: Segment[], now: number, first: boolean) =>
  div(
    { class: ['flex items-start gap-3 px-3 py-2 sm:items-center', first ? '' : 'border-t border-neutral-700'] },
    span({ class: 'w-24 shrink-0 truncate pt-1.5 text-sm text-neutral-200 sm:pt-0' }, label),
    limitBar(segments, now),
  )

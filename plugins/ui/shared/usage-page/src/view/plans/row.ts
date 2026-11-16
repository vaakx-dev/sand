import { div, span, type Child } from '@vaakx-dev/vrui'
import { limitBar, type BarProps } from './bar'

export const framed = (...rows: Child[]) => div({ class: 'flex flex-col rounded-lg border border-neutral-700' }, ...rows)

export const windowRow = (bar: BarProps, first: boolean, ...below: Child[]) =>
  div(
    { class: ['flex items-start gap-3 px-3 py-2 sm:items-center', first ? '' : 'border-t border-neutral-700'] },
    span({ class: 'w-24 shrink-0 truncate pt-1.5 text-sm text-neutral-200 sm:pt-0' }, bar.label),
    limitBar(bar, ...below),
  )

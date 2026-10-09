import { div, p, span, type Child } from '@vaakx-dev/vrui'
import { icon } from '../icons/lucide'

export const pageHead = (text: Child, action: Child) =>
  div({ class: 'flex flex-wrap items-center gap-3 px-1' }, p({ class: 'min-w-48 flex-1 text-sm text-neutral-400' }, text), action)

export const doneMark = () =>
  span({ class: 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-950 text-success-400' }, icon('check', 20))

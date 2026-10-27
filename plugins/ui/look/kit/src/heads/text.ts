import { read, span, type Child, type MaybeReactive } from '@vaakx-dev/vrui'

export const rowTitle = (...children: Child[]) => span({ class: 'min-w-0 truncate text-sm group-aria-current:font-medium' }, ...children)

export const metaLine = (...children: Child[]) => span({ class: 'min-w-0 truncate text-xs text-neutral-400' }, ...children)

export const countMark = (value: MaybeReactive<number>) => span({ class: 'shrink-0 text-xs font-normal text-neutral-500 tabular-nums' }, () => String(read(value)))

import { div, span, type Child } from '@sand/dom'

export const label = (...children: Child[]) => span({ class: 'text-xs text-neutral-400' }, ...children)

export const block = (...children: Child[]) => div({ class: 'flex flex-col gap-4 bg-neutral-900 p-4' }, ...children)

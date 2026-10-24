import { div, type Child } from '@vaakx-dev/vrui'

export const page = (...children: Child[]) => div({ class: 'absolute inset-0 overflow-auto bg-neutral-950' }, ...children)

export const bar = (...children: Child[]) => div({ class: 'sticky top-0 left-0 z-10 flex items-center gap-2 bg-neutral-950 px-3 py-2' }, ...children)

export const pathLine = (path: Child) => div({ class: 'sticky left-0 px-4 pb-2 text-xs text-neutral-500 wrap-anywhere' }, path)

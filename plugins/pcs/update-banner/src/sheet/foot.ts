import { div, type Child } from '@sand/dom'

export const sheetFoot = (...children: Child[]) =>
  div({ class: 'flex shrink-0 items-center justify-end gap-2 border-t border-neutral-700 px-5 py-3' }, ...children)

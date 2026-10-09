import { div, span, type Child } from '@sand/dom'

/** A pairing or sharing link, shown in full width monospace and cut off with an ellipsis. */
export const linkText = (url: string) => span({ class: 'min-w-0 flex-1 truncate font-mono text-xs text-neutral-300' }, url)

/** The scrolling body of a devices sheet, below its sheetHead. */
export const sheetBody = (...children: Child[]) => div({ class: 'flex min-h-0 flex-col gap-4 overflow-auto px-5 pt-1 pb-5' }, ...children)

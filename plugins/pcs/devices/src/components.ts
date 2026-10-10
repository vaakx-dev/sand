import { div, p, span, type Child } from '@sand/dom'

export const linkText = (url: string) => span({ class: 'min-w-0 flex-1 truncate font-mono text-xs text-neutral-300' }, url)

export const sheetBody = (...children: Child[]) => div({ class: 'flex min-h-0 flex-col gap-4 overflow-auto px-5 pt-1 pb-5' }, ...children)

export const note = (...children: Child[]) => p({ class: 'text-xs text-neutral-400' }, ...children)

import { div, h1, h2, p, type Child } from '@vaakx-dev/vrui'

export const pageHead = (text: Child, action: Child) =>
  div({ class: 'flex flex-wrap items-center gap-3 px-1' }, p({ class: 'min-w-48 flex-1 text-sm text-neutral-400' }, text), action)

export const paneHead = (...children: Child[]) => div({ class: 'flex h-12 shrink-0 items-center gap-2 pl-4 pr-3' }, ...children)

export const headTitle = (level: 1 | 2, title: Child) =>
  (level === 1 ? h1 : h2)({ class: 'min-w-0 flex-1 truncate text-sm font-semibold text-neutral-100' }, title)

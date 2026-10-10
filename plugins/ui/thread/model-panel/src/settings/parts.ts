import type { SourceInfo } from '@sand/llm-accounts/contract'
import { button, div, focusable, icon, providerIcon, rowButton, span, tile, type Child } from '@sand/dom'
import type { Kit } from './kit'

export const logo = (provider?: string) => tile(providerIcon(provider, 18) ?? icon('sparkles', 16))

export const whereText = (source: SourceInfo) => (source.via ? `on ${source.via}${source.online === false ? ' · offline' : ''}` : '')

export interface LinkRow {
  mark: Child
  title: Child
  detail?: Child
  end?: Child[]
  onClick(): void
}

export const linkRow = ({ mark, title, detail, end = [], onClick }: LinkRow) =>
  rowButton(
    { class: 'min-h-12 gap-3 bg-neutral-900 px-4 py-3 hover:bg-neutral-800', onClick },
    mark,
    div(
      { class: 'flex min-w-0 flex-1 flex-col' },
      span({ class: 'truncate text-sm text-neutral-100' }, title),
      detail ? span({ class: 'truncate text-xs text-neutral-500' }, detail) : null,
    ),
    ...end,
    span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon('right', 14)),
  )

export const crumb = (kit: Kit, mark: Child, title: Child) =>
  div(
    { class: 'flex min-w-0 items-center gap-2 px-1' },
    button(
      { type: 'button', class: ['shrink-0 rounded-md text-sm text-neutral-400 hover:text-neutral-100', focusable], onClick: () => kit.go({ kind: 'top' }) },
      'Models',
    ),
    span({ class: 'inline-flex shrink-0 text-neutral-600' }, icon('right', 14)),
    mark,
    span({ class: 'truncate text-sm font-medium text-neutral-100' }, title),
  )

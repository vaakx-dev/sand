import { div, h2, providerColor, providerIcon, span, type Child } from '@sand/dom'

export const heading = (...children: Child[]) => h2({ class: 'flex min-w-0 items-center gap-2 text-sm font-medium text-neutral-100' }, ...children)

export const muted = (...children: Child[]) => span({ class: 'text-xs text-neutral-500' }, ...children)

export const metric = (label: string, value: string) =>
  div(
    { class: 'flex min-w-0 flex-col gap-1' },
    muted(label),
    span({ class: 'truncate text-base font-medium text-neutral-100 tabular-nums' }, value),
  )

export const swatch = (provider: string, order: number) =>
  span({ class: 'h-2 w-2 shrink-0 rounded-full', style: { background: providerColor(provider, order) } })

export const providerMark = (provider: string, order: number, size = 16) =>
  span({ class: 'inline-flex shrink-0 items-center gap-2' }, swatch(provider, order), providerIcon(provider, size))

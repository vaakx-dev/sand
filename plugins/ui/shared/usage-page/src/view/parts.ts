import { div, h2, h3, section, span, type Child } from '@sand/dom'

export const heading = (...children: Child[]) => h2({ class: 'flex min-w-0 items-center gap-2 text-sm font-medium text-neutral-100' }, ...children)

export const muted = (...children: Child[]) => span({ class: 'text-xs text-neutral-500' }, ...children)

export const block = (head: Child[], ...body: Child[]) =>
  section({ class: 'flex flex-col gap-3' }, div({ class: 'flex flex-wrap items-center gap-x-3 gap-y-2' }, ...head), ...body)

export const spacer = () => span({ class: 'flex-1' })

export const card = (title: string, meta: Child, ...body: Child[]) =>
  div(
    { class: 'flex flex-col gap-4 rounded-xl border border-neutral-800 px-4 py-3' },
    div({ class: 'flex flex-wrap items-baseline gap-x-2 gap-y-1' }, h3({ class: 'text-sm font-medium text-neutral-100' }, title), muted(meta)),
    ...body,
  )

export const stat = (label: string, value: Child, note?: Child) =>
  div(
    { class: 'flex flex-col gap-1' },
    muted(label),
    span({ class: 'text-lg font-semibold text-neutral-100 tabular-nums' }, value),
    note ? muted(note) : null,
  )

export const stats = (...children: Child[]) => div({ class: 'flex flex-wrap items-center gap-x-8 gap-y-4' }, ...children)

export const chip = (...children: Child[]) =>
  span({ class: 'inline-flex shrink-0 items-center gap-1 rounded-sm bg-neutral-800 px-2 text-xs text-neutral-300' }, ...children)

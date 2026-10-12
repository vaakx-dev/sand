import type { Kit } from '@sand/ui-kit/contract'
import { div, h3, span, type Child } from '@vaakx-dev/vrui'

export const muted = (...children: Child[]) => span({ class: 'text-xs text-neutral-500' }, ...children)

export const sectionTitle = (...children: Child[]) => span({ class: 'inline-flex min-w-0 items-center gap-2' }, ...children)

export const sectionActions = (...children: Child[]) => div({ class: 'flex flex-wrap items-center gap-3' }, ...children)

export const block = ({ sectionRow }: Kit, ...children: Child[]) => sectionRow({}, div({ class: 'flex min-w-0 flex-1 flex-col gap-3 py-1' }, ...children))

export const card = ({ sectionRow }: Kit, title: string, meta: Child, ...body: Child[]) =>
  sectionRow(
    {},
    div(
      { class: 'flex min-w-0 flex-1 flex-col gap-4 py-1' },
      div({ class: 'flex flex-wrap items-baseline gap-x-2 gap-y-1' }, h3({ class: 'text-sm font-medium text-neutral-100' }, title), muted(meta)),
      ...body,
    ),
  )

export const stat = (label: string, value: Child, note?: Child) =>
  div(
    { class: 'flex flex-col gap-1' },
    muted(label),
    span({ class: 'text-lg font-semibold text-neutral-100 tabular-nums' }, value),
    note ? muted(note) : null,
  )

export const stats = (...children: Child[]) => div({ class: 'flex flex-wrap items-center gap-x-8 gap-y-4' }, ...children)

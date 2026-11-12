import { div, span, type Child } from '@vaakx-dev/vrui'
import { age } from '../rows/work-row'

export interface CardProps {
  title: Child
  lead?: Child
  at?: number
}

export const card = ({ title, lead, at }: CardProps, ...body: Child[]) =>
  div(
    { class: 'flex min-w-0 flex-col gap-2 rounded-lg bg-neutral-800 px-4 py-3' },
    div(
      { class: 'flex min-w-0 items-center gap-2' },
      lead ?? null,
      span({ class: 'min-w-0 flex-1 truncate text-sm font-semibold text-neutral-100' }, title),
      at === undefined ? null : age(at),
    ),
    ...body,
  )

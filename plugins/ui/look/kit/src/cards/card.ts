import { div, type Child } from '@vaakx-dev/vrui'
import { metaLook } from '../heads/text'

export interface CardProps {
  meta?: Child
  actions?: Child
}

export const card = ({ meta, actions }: CardProps, ...body: Child[]) =>
  div(
    { class: 'flex min-w-0 flex-col gap-2 py-2' },
    body.length > 0 ? div({ class: 'min-w-0' }, ...body) : null,
    div(
      { class: 'flex min-w-0 flex-wrap items-center gap-2' },
      div({ class: ['flex min-w-0 flex-1 items-center gap-2', metaLook] }, meta ?? null),
      div({ class: 'ml-auto flex shrink-0 items-center gap-2' }, actions ?? null),
    ),
  )

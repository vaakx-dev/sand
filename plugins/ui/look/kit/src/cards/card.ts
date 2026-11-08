import { div, type Child } from '@vaakx-dev/vrui'

export interface CardProps {
  meta?: Child
  actions?: Child
}

export const card = ({ meta, actions }: CardProps, ...body: Child[]) =>
  div(
    { class: 'flex min-w-0 flex-col rounded-lg border border-neutral-800' },
    body.length > 0 ? div({ class: 'min-w-0 border-b border-neutral-800 p-3' }, ...body) : null,
    div(
      { class: 'flex min-w-0 flex-wrap items-center gap-2 py-2 pr-2 pl-3' },
      div({ class: 'flex min-w-0 flex-1 items-center gap-2 text-xs text-neutral-500' }, meta ?? null),
      div({ class: 'ml-auto flex shrink-0 items-center gap-2' }, actions ?? null),
    ),
  )

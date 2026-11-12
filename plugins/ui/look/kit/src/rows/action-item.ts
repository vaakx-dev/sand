import { div, span, type Child } from '@vaakx-dev/vrui'
import { rowNameLook, secondaryLook } from '../heads/text'
import { age } from './work-row'

export interface ActionItemProps {
  title: Child
  lead?: Child
  at?: number
  actions?: Child[]
}

const leadBox = (lead: Child) => span({ class: 'flex h-8 w-8 shrink-0 items-center justify-center' }, lead)

const head = (title: Child, at: number | undefined) =>
  div({ class: 'flex min-w-0 items-baseline gap-2' }, span({ class: ['min-w-0 flex-1 truncate', rowNameLook] }, title), at === undefined ? null : age(at))

export const actionItem = ({ title, lead, at, actions = [] }: ActionItemProps, ...body: Child[]) =>
  div(
    { class: 'flex min-w-0 gap-3 px-2 py-3' },
    lead ? leadBox(lead) : null,
    div(
      { class: 'flex min-w-0 flex-1 flex-col gap-px pt-1.5' },
      head(title, at),
      div({ class: [secondaryLook, 'flex min-w-0 flex-col gap-2 leading-relaxed wrap-anywhere'] }, ...body),
      actions.length ? div({ class: 'mt-2 flex flex-wrap items-center gap-1' }, ...actions) : null,
    ),
  )

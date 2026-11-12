import { div, span, type Child } from '@vaakx-dev/vrui'
import { rowNameLook, secondaryLook } from '../heads/text'
import { age } from './work-row'

export interface ActionItemProps {
  title: Child
  lead?: Child
  at?: number
  actions?: Child[]
}

const leadBox = (lead: Child) => span({ class: 'flex h-5 w-5 shrink-0 items-center justify-center' }, lead)

const head = (title: Child, at: number | undefined) =>
  div({ class: 'flex min-w-0 items-baseline gap-2' }, span({ class: ['min-w-0 grow truncate lg:grow-0', rowNameLook] }, title), at === undefined ? null : age(at))

const actionsRow = (lead: boolean, actions: Child[]) =>
  div({ class: ['mt-1 -ml-2 flex shrink-0 flex-wrap items-center gap-2 lg:mt-0 lg:ml-0 lg:-mr-2 lg:self-center', lead && 'pl-8 lg:pl-0'] }, ...actions)

export const actionItem = ({ title, lead, at, actions = [] }: ActionItemProps, ...body: Child[]) =>
  div(
    { class: 'flex min-w-0 flex-col px-2 py-3 lg:flex-row lg:gap-6' },
    div(
      { class: 'flex min-w-0 flex-1 items-start gap-3' },
      lead ? leadBox(lead) : null,
      div(
        { class: 'flex min-w-0 flex-1 flex-col gap-px' },
        head(title, at),
        div({ class: [secondaryLook, 'flex min-w-0 flex-col gap-2 leading-relaxed wrap-anywhere'] }, ...body),
      ),
    ),
    actions.length ? actionsRow(Boolean(lead), actions) : null,
  )

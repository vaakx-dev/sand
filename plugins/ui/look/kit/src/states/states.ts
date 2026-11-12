import { div, show, span, type Child } from '@vaakx-dev/vrui'
import { secondaryAction } from '../buttons/button'
import { secondaryLook } from '../heads/text'
import { icon } from '../icons/lucide'
import { delayed } from '../page/delayed'
import type { Surface } from '../surface'

export interface StateProps {
  surface?: Surface
  flush?: boolean
}

export interface EmptyAction {
  label: string
  run(): void
}

export interface EmptyProps {
  text: Child
  action?: EmptyAction
}

export interface ErrorProps extends StateProps {
  text: Child
  retry?: () => void
}

const pads: Record<Surface, string> = { page: 'px-2 py-2', raised: 'px-2 py-2', group: 'min-h-12 py-3' }

const padOf = ({ surface = 'page', flush = false }: StateProps) => (flush ? 'py-2' : pads[surface])

export const loadingState = ({ text = 'Loading…', ...where }: StateProps & { text?: Child } = {}) =>
  show(delayed(true), () => div({ role: 'status', class: [padOf(where), 'text-sm text-neutral-500'] }, text))

export const emptyState = ({ text, action }: EmptyProps) =>
  div(
    { class: ['flex flex-wrap items-center gap-x-3 gap-y-2 py-2', secondaryLook] },
    span({ class: 'min-w-0' }, text),
    action ? secondaryAction({ size: 'sm', onClick: () => action.run() }, action.label) : null,
  )

const balanced = { textWrap: 'balance' }

export const emptyPage = ({ title, text }: { title: Child; text: Child }) =>
  div({ class: 'flex flex-col items-center gap-1 px-6 py-24 text-center' }, div({ class: 'text-base font-medium text-neutral-100' }, title), div({ class: secondaryLook, style: balanced }, text))

export const errorState = ({ text, retry, ...where }: ErrorProps) =>
  div(
    { role: 'alert', class: [padOf(where), 'flex flex-wrap items-center gap-3'] },
    span({ class: 'inline-flex shrink-0 text-danger-400' }, icon('alert', 16)),
    div({ class: 'min-w-0 flex-1 text-sm wrap-anywhere text-neutral-100' }, text),
    retry ? secondaryAction({ size: 'sm', onClick: retry }, 'Retry') : null,
  )

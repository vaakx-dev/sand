import { div, p, show, span, type Child } from '@vaakx-dev/vrui'
import { secondaryAction } from '../buttons/button'
import { icon, type IconName } from '../icons/lucide'
import { errorText } from '../notes/notes'
import { delayed } from '../page/delayed'
import type { Surface } from '../surface'

export interface StateProps {
  surface?: Surface
  flush?: boolean
}

export interface EmptyProps extends StateProps {
  text: Child
  action?: Child
}

export interface ErrorProps extends StateProps {
  text: Child
  retry?: () => void
}

const pads: Record<Surface, string> = { page: 'px-2 py-2', raised: 'px-2 py-2', group: 'min-h-12 bg-neutral-800 px-4 py-3' }

const padOf = ({ surface = 'page', flush = false }: StateProps) => (flush ? 'py-2' : pads[surface])

export const loadingState = ({ text = 'Loading…', ...where }: StateProps & { text?: Child } = {}) =>
  show(delayed(true), () => div({ role: 'status', class: [padOf(where), 'text-sm text-neutral-500'] }, text))

export const emptyState = ({ text, action, ...where }: EmptyProps) =>
  div({ class: [padOf(where), 'flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-neutral-400'] }, span({ class: 'min-w-0' }, text), action ?? null)

export const errorState = ({ text, retry, ...where }: ErrorProps) =>
  div(
    { role: 'alert', class: [padOf(where), 'flex flex-wrap items-center gap-3'] },
    div({ class: 'min-w-0 flex-1' }, errorText(text)),
    retry ? secondaryAction({ size: 'sm', onClick: retry }, 'Retry') : null,
  )

export interface BlockProps {
  icon: IconName
  title: Child
  text: Child
  action?: Child
}

export const emptyBlock = ({ icon: name, title, text, action }: BlockProps) =>
  div(
    { class: 'flex flex-col items-center gap-2 px-4 py-12 text-center' },
    span({ class: 'mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-800 text-neutral-400' }, icon(name, 20)),
    p({ class: 'text-sm font-semibold text-neutral-100' }, title),
    p({ class: 'max-w-sm text-sm text-neutral-400' }, text),
    action ? div({ class: 'mt-2 flex' }, action) : null,
  )

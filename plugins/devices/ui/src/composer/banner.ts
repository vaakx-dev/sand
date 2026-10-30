import { div, dynamicChild, span } from '@vaakx-dev/vrui'
import type { Ui } from '../ui'
import type { ConnectionState, Trouble } from './state'

const tryingLine = (ui: Ui, state: ConnectionState) => {
  const { secondaryAction, spinner } = ui.kit
  return div(
    { role: 'status', class: 'flex min-h-6 items-start gap-2 pb-1' },
    span({ class: 'inline-flex h-6 shrink-0 items-center' }, spinner('md')),
    span({ class: 'min-w-0 flex-1 leading-6' }, state.headline),
    secondaryAction({ size: 'sm', onClick: () => ui.ctx.pcs.retry(state.pc.get()) }, 'Retry now'),
  )
}

const downBlock = (ui: Ui, state: ConnectionState, stopped: boolean) => {
  const { icon, quietButton, secondaryAction } = ui.kit
  return div(
    { role: stopped ? 'alert' : 'status', class: 'flex flex-col gap-2 pb-1' },
    div(
      { class: ['flex min-h-6 items-start gap-2', stopped ? 'text-danger-400' : 'text-warning-400'] },
      span({ class: 'inline-flex h-6 shrink-0 items-center' }, icon('alert', 'md')),
      span({ class: 'min-w-0 flex-1 leading-6' }, state.headline),
    ),
    div({ class: 'pl-6 text-neutral-400' }, state.detail),
    div(
      { class: 'flex flex-wrap items-center gap-2 pl-6' },
      secondaryAction({ size: 'sm', onClick: () => ui.ctx.pcs.retry(state.pc.get()) }, 'Retry now'),
      quietButton({ size: 'sm', surface: 'raised', onClick: () => ui.open.why(state.pc.get()) }, 'Why?'),
    ),
  )
}

export const connectionBanner = (ui: Ui, state: ConnectionState) =>
  dynamicChild(
    () => state.trouble.get() ?? ('trying' as Trouble),
    trouble => (trouble === 'trying' ? tryingLine(ui, state) : downBlock(ui, state, trouble === 'blocked')),
  )

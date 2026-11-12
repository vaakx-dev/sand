import { dynamicChild } from '@vaakx-dev/vrui'
import type { Ui } from '../ui'
import type { ConnectionState, Trouble } from './state'

const waiting = new Set<Trouble>(['checking', 'catching-up', 'trying'])

const tryingLine = (ui: Ui, state: ConnectionState, retry: boolean) => {
  const { banner, secondaryAction } = ui.kit
  return banner({
    icon: 'spinner',
    title: state.headline,
    actions: retry ? [secondaryAction({ size: 'sm', onClick: () => ui.ctx.pcs.retry(state.pc.get()) }, 'Retry now')] : [],
  })
}

const downBlock = (ui: Ui, state: ConnectionState, stopped: boolean) => {
  const { banner, quietButton, secondaryAction } = ui.kit
  return banner({
    tone: stopped ? 'danger' : 'warning',
    title: state.headline,
    detail: state.detail,
    actions: [
      secondaryAction({ size: 'sm', onClick: () => ui.ctx.pcs.retry(state.pc.get()) }, 'Retry now'),
      quietButton({ size: 'sm', surface: 'raised', onClick: () => ui.open.why(state.pc.get()) }, 'Why?'),
    ],
  })
}

export const connectionBanner = (ui: Ui, state: ConnectionState) =>
  dynamicChild(
    () => state.trouble.get() ?? ('trying' as Trouble),
    trouble => (waiting.has(trouble) ? tryingLine(ui, state, trouble === 'trying') : downBlock(ui, state, trouble === 'blocked')),
  )

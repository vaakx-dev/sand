import type { NavAction } from '@sand/protocol'
import type { Kit } from '@sand/ui-kit/contract'
import type { Fleet, PcView } from './fleet/model'
import type { RunStatus } from './fleet/run'

export type ActionKind = 'update' | 'retry' | 'restart'

export const pcActionKind = (pc: PcView): ActionKind | undefined => {
  const { status } = pc
  if (status.kind === 'behind') return 'update'
  if (status.kind === 'failed') return 'retry'
  if (status.kind === 'busy' && status.phase === 'waiting' && pc.state?.running) return 'restart'
  return undefined
}

export const runActionKind = (status: RunStatus): ActionKind | undefined => {
  if (status.kind === 'failed') return 'retry'
  if (status.kind === 'working' && status.phase === 'waiting' && status.running) return 'restart'
  return undefined
}

export const fleetAction = (fleet: Fleet, key: string, kind: ActionKind): NavAction => {
  if (kind === 'update') return { id: 'update', label: 'Update', icon: 'up', run: () => fleet.update([key]) }
  if (kind === 'retry') return { id: 'retry', label: 'Retry', icon: 'retry', run: () => fleet.retry(key) }
  return { id: 'restart', label: 'Restart now', icon: 'reload', run: () => fleet.restartNow(key) }
}

export const actionButton = ({ secondaryAction }: Kit, { label, run }: NavAction) => secondaryAction({ size: 'sm', onClick: () => void run() }, label)

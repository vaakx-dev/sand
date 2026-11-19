import type { MenuAction } from '@sand/ui-shell/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { Fleet, PcView } from './fleet/model'
import type { RunStatus } from './fleet/run'

export type ActionKind = 'update' | 'retry'

export const pcActionKind = (pc: PcView): ActionKind | undefined => {
  const { status } = pc
  if (status.kind === 'behind') return 'update'
  if (status.kind === 'failed') return 'retry'
  return undefined
}

export const runActionKind = (status: RunStatus): ActionKind | undefined => (status.kind === 'failed' ? 'retry' : undefined)

export const fleetAction = (fleet: Fleet, key: string, kind: ActionKind): MenuAction =>
  kind === 'update' ? { id: 'update', label: 'Update', icon: 'up', run: () => fleet.update([key]) } : { id: 'retry', label: 'Retry', icon: 'retry', run: () => fleet.retry(key) }

export const actionButton = ({ secondaryAction }: Kit, { label, run }: MenuAction) => secondaryAction({ size: 'sm', onClick: () => void run() }, label)

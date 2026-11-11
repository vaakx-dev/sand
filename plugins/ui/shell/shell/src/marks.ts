import type { Kit, WorkState } from '@sand/ui-kit/contract'
import { clock, span } from '@vaakx-dev/vrui'
import type { Status } from './contract'

const workStates: Record<Status, WorkState> = { waiting: 'waiting', ready: 'ready', merging: 'running', running: 'running', merged: 'settled', done: 'settled' }

export const statusIcon = (kit: Kit, status: Status) => kit.stateIcon(workStates[status], 'sm', status === 'waiting' || status === 'ready' || status === 'merging')

export const ageEnd = (kit: Kit, at?: number) => {
  if (at === undefined) return null
  const now = clock(60_000)
  return span({ class: 'shrink-0 text-xs text-neutral-500 tabular-nums' }, () => kit.shortAge(Math.max(0, now.get() - at)))
}

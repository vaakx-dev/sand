import type { Kit, Tint, WorkState } from '@sand/ui-kit/contract'
import type { Monogram, Status } from './contract'

const workStates: Record<Status, WorkState> = { waiting: 'waiting', ready: 'ready', merging: 'running', running: 'running', merged: 'settled', done: 'settled' }

const names: Record<Status, string> = { waiting: 'Waiting', ready: 'Ready', merging: 'Merging', running: 'Working', merged: 'Merged', done: 'Done' }

const tints: Record<Tint, true> = { gold: true, sky: true, orange: true, green: true, red: true, grey: true }

const isTint = (color: string): color is Tint => Object.hasOwn(tints, color)

export const urgent = (status: Status | undefined) => status === 'waiting' || status === 'ready' || status === 'merging'

export const statusName = (status: Status) => names[status]

export const statusIcon = (kit: Kit, status: Status) => kit.stateIcon(workStates[status], 'sm', urgent(status))

export const monogramOf = (kit: Kit, { initial, color }: Monogram) => kit.monogram(initial, isTint(color) ? color : 'grey')

const minute = 60_000

export const age = (ms: number) => {
  const minutes = Math.floor(ms / minute)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`
}

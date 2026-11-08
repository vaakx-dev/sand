import type { Kit, Tint, WorkState } from '@sand/ui-kit/contract'
import type { Monogram, Status } from './contract'

const workStates: Record<Status, WorkState> = { waiting: 'waiting', ready: 'ready', merging: 'running', running: 'running', merged: 'settled', done: 'settled' }

const tints: Record<Tint, true> = { gold: true, sky: true, orange: true, green: true, red: true, grey: true }

const isTint = (color: string): color is Tint => Object.hasOwn(tints, color)

export const urgent = (status: Status | undefined) => status === 'waiting' || status === 'ready' || status === 'merging'

export const statusIcon = (kit: Kit, status: Status) => kit.stateIcon(workStates[status], 'sm', urgent(status))

export const monogramOf = (kit: Kit, { initial, color }: Monogram) => kit.monogram(initial, isTint(color) ? color : 'grey')

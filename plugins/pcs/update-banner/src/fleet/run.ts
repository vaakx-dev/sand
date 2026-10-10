import type { UpdatePhase } from '@sand/host-updates/contract'
import { isBusy, type Pc } from './status'

export interface Run {
  build: string
  name: string
  keys: string[]
}

export type RunStatus =
  | { kind: 'done' }
  | { kind: 'failed'; error: string }
  | { kind: 'working'; phase: UpdatePhase; running: number }
  | { kind: 'reconnecting' }
  | { kind: 'starting' }

export const runStatus = (pc: Pc | undefined, build: string): RunStatus => {
  const state = pc?.state
  if (pc?.failure) return { kind: 'failed', error: pc.failure }
  if (!pc?.online) return { kind: 'reconnecting' }
  if (state?.current?.id === build && !isBusy(state)) return { kind: 'done' }
  if (state?.phase === 'failed') return { kind: 'failed', error: state.error ?? 'Could not update sand' }
  if (state && isBusy(state)) return { kind: 'working', phase: state.phase, running: state.running ?? 0 }
  return { kind: 'starting' }
}

export const isSettled = (status: RunStatus) => status.kind === 'done' || status.kind === 'failed'

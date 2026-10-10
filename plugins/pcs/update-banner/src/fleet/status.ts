import type { ReleaseInfo, UpdateChannel, UpdatePhase, UpdateState } from '@sand/host-updates/contract'
import type { BuildInfo } from '@sand/protocol'

export interface Pc {
  key: string
  name: string
  local: boolean
  online: boolean
  state?: UpdateState
  failure?: string
}

export type PcStatus =
  | { kind: 'offline' }
  | { kind: 'loading' }
  | { kind: 'source' }
  | { kind: 'busy'; phase: UpdatePhase }
  | { kind: 'failed'; error: string }
  | { kind: 'channel'; channel: UpdateChannel }
  | { kind: 'current' }
  | { kind: 'newer' }
  | { kind: 'behind'; count?: number; beyond?: boolean }

export const farBehind = 20

const busyPhases: UpdatePhase[] = ['downloading', 'installing', 'switching', 'waiting', 'restarting']

export const isBusy = (state: UpdateState | undefined) => !!state && busyPhases.includes(state.phase)

export const behindBy = (target: ReleaseInfo, current: BuildInfo): number | undefined => {
  if (current.id === target.build.id) return 0
  const index = current.commit ? (target.changes?.findIndex(change => change.commit === current.commit) ?? -1) : -1
  return index >= 0 ? index : undefined
}

export const pcStatus = (pc: Pc, target: ReleaseInfo | undefined, channel: UpdateChannel | undefined): PcStatus => {
  const state = pc.state
  if (!pc.online) return { kind: 'offline' }
  if (!state) return { kind: 'loading' }
  if (!state.installed) return { kind: 'source' }
  if (isBusy(state)) return { kind: 'busy', phase: state.phase }
  if (state.phase === 'failed') return { kind: 'failed', error: state.error ?? 'Could not update sand' }
  if (channel && state.channel !== channel) return { kind: 'channel', channel: state.channel }
  if (!target || !state.current) return { kind: 'current' }
  if (state.current.id !== target.build.id && state.current.time > target.build.time) return { kind: 'newer' }
  const count = behindBy(target, state.current)
  if (count === 0) return { kind: 'current' }
  if (count !== undefined) return { kind: 'behind', count }
  return { kind: 'behind', beyond: !!state.current.commit && !!target.changes?.length }
}

export const canUpdate = (status: PcStatus) => status.kind === 'behind' || status.kind === 'channel' || status.kind === 'failed'

export const isFar = (status: PcStatus) => status.kind === 'behind' && (!!status.beyond || (status.count ?? 0) >= farBehind)

export const pickTarget = (states: UpdateState[], channel: UpdateChannel | undefined) =>
  states
    .filter(state => state.channel === channel && state.latest)
    .map(state => state.latest!)
    .sort((a, b) => b.build.time - a.build.time)[0]

export const changesFor = (target: ReleaseInfo | undefined, statuses: PcStatus[]) => {
  const changes = target?.changes ?? []
  const counts = statuses.flatMap(status => (status.kind === 'behind' ? [status.count] : status.kind === 'channel' ? [undefined] : []))
  if (!counts.length || counts.includes(undefined)) return changes
  return changes.slice(0, Math.max(...(counts as number[])))
}

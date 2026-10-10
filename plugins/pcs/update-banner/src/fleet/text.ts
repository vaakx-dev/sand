import type { ReleaseInfo, UpdateChannel, UpdatePhase } from '@sand/host-updates/contract'
import type { Tone } from '@sand/dom'
import type { BuildInfo } from '@sand/protocol'
import type { RunStatus } from './run'
import { isFar, type PcStatus } from './status'

export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

export const channelNames: Record<UpdateChannel, string> = { release: 'Releases', nightly: 'Nightly', dev: 'Dev' }

export const versionText = (build: BuildInfo | undefined, target: ReleaseInfo | undefined) => {
  if (!build) return ''
  if (target && build.id === target.build.id) return target.name
  return build.commit ? build.commit.slice(0, 7) : `build ${build.id.slice(0, 6)}`
}

export const phaseText = (phase: UpdatePhase, running = 0) => {
  switch (phase) {
    case 'downloading':
      return 'Downloading from GitHub…'
    case 'installing':
      return 'Installing…'
    case 'switching':
      return 'Switching over…'
    case 'waiting':
      return running ? `Restarts when ${plural(running, 'running thread')} finish${running === 1 ? 'es' : ''}` : 'Restarting soon…'
    default:
      return 'Restarting…'
  }
}

export const behindText = (status: Extract<PcStatus, { kind: 'behind' }>, target: ReleaseInfo | undefined) => {
  if (status.count !== undefined) return `${plural(status.count, 'change')} behind`
  const listed = target?.changes?.length
  return status.beyond && listed ? `More than ${plural(listed, 'change')} behind` : 'Runs an older build'
}

export const statusText = (status: PcStatus, target: ReleaseInfo | undefined) => {
  switch (status.kind) {
    case 'offline':
      return 'Offline'
    case 'loading':
      return 'Checking…'
    case 'source':
      return 'Runs from a source folder'
    case 'busy':
      return phaseText(status.phase)
    case 'failed':
      return status.error
    case 'channel':
      return `Gets ${channelNames[status.channel]} builds`
    case 'current':
      return 'Up to date'
    case 'newer':
      return 'Runs a newer build'
    case 'behind':
      return behindText(status, target)
  }
}

export const statusTone = (status: PcStatus): Tone => {
  switch (status.kind) {
    case 'busy':
      return 'accent'
    case 'failed':
      return 'danger'
    case 'channel':
      return 'warning'
    case 'current':
      return 'success'
    case 'behind':
      return isFar(status) ? 'warning' : 'accent'
    default:
      return 'neutral'
  }
}

export const runText = (status: RunStatus) => {
  switch (status.kind) {
    case 'done':
      return 'Updated'
    case 'failed':
      return status.error
    case 'working':
      return phaseText(status.phase, status.running)
    case 'reconnecting':
      return 'Restarting… reconnects by itself'
    case 'starting':
      return 'Starting…'
  }
}

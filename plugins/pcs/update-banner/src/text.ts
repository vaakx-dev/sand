import type { UpdatePhase, UpdateState } from '@sand/host-updates/contract'

export const short = (id: string | undefined) => id?.slice(0, 6) ?? ''

export const busyPhases: UpdatePhase[] = ['downloading', 'installing', 'switching', 'waiting', 'restarting']

export const isBusy = (state: UpdateState | undefined) => !!state && busyPhases.includes(state.phase)

export const releaseName = (state: UpdateState) => state.latest?.name ?? `build ${short(state.latest?.build.id)}`

export const progressText = (state: UpdateState) => {
  const name = releaseName(state)
  switch (state.phase) {
    case 'downloading':
      return `Downloading sand ${name} from GitHub…`
    case 'installing':
      return `Installing sand ${name}…`
    case 'switching':
      return `Switching to sand ${name}…`
    case 'waiting':
      return 'Sand restarts when running threads finish or time out'
    default:
      return 'Restarting sand…'
  }
}

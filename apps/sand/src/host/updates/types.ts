import type { BuildInfo, HostApp, Runtimes, UpdateChannel, UpdateState } from '@sand/protocol'
import type { GithubRelease } from '../github'
import type { HealthOutcome } from './health/types'

export interface PreparedBuild {
  root: string
  build: BuildInfo
  bun: string
  bunPath: string
}

export interface UpdaterDeps {
  home: string
  hostRoot: string
  app: HostApp
  runtimes: Pick<Runtimes, 'swap' | 'live'>
  drainTimeout: number
  current(): Promise<BuildInfo>
  find(channel: UpdateChannel): Promise<GithubRelease>
  download(release: GithubRelease): Promise<Uint8Array>
  prepare(bytes: Uint8Array, force: boolean): Promise<PreparedBuild>
  checkLoads(root: string, bun: string): Promise<void>
  hostChanged(running: string, next: string): Promise<boolean>
  switchTo(id: string): Promise<void>
  refreshShim(): Promise<void>
  restorePrevious(): Promise<unknown>
  health(): Promise<HealthOutcome>
  cleanup(keep: string[]): Promise<void>
  restart(): void
  changed(state: UpdateState): void
}

export interface Updater {
  state(): UpdateState
  check(): Promise<UpdateState>
  later(): Promise<UpdateState>
  setChannel(channel: UpdateChannel): Promise<UpdateState>
  apply(build: string): Promise<UpdateState>
  repair(): Promise<UpdateState & { target: BuildInfo }>
  start(): void
  stop(): void
}

import type { Runtimes } from '@sand/host-runtimes/contract'
import type { GithubRelease, HealthOutcome } from '@sand/kit/host'
import type { BuildInfo, HostApp } from '@sand/protocol'
import type { UpdateChannel, UpdateState } from './contract'

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
  restartNow(): UpdateState
  repair(): Promise<UpdateState & { target: BuildInfo }>
  start(): void
  stop(): void
}

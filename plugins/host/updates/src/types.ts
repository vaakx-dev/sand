import type { HostApp } from '@sand/host-daemon/contract'
import type { BuildInfo } from '@sand/host-dist/contract'
import type { Runtimes } from '@sand/host-runtimes/contract'
import type { HealthOutcome } from '@sand/util/boot'
import type { UpdateChannel, UpdateState } from './contract'
import type { GithubRelease } from './github/release'

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
  health(): Promise<HealthOutcome>
  cleanup(keep: string[]): Promise<void>
  restart(): void
  changed(state: UpdateState): void
  announce(channel: UpdateChannel, build: string): void
}

export interface Updater {
  state(): UpdateState
  check(): Promise<UpdateState>
  later(): Promise<UpdateState>
  setChannel(channel: UpdateChannel): Promise<UpdateState>
  apply(build: string): Promise<UpdateState>
  heard(channel: UpdateChannel, build: string): UpdateState
  restartNow(): UpdateState
  repair(): Promise<UpdateState & { target: BuildInfo }>
  start(): void
  stop(): void
}

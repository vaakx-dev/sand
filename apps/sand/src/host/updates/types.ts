import type { BuildInfo, HostApp, Runtimes, UpdateState } from '@sand/protocol'
import type { HealthOutcome } from './health/types'

export interface BunDownload {
  version: string
  sha256: string
  bytes: Uint8Array
}

export interface UpdateSource {
  id: string
  name: string
  latest(): Promise<BuildInfo | undefined>
  download(): Promise<Uint8Array>
  bun(target: string): Promise<BunDownload>
}

export interface FoundUpdate {
  source: UpdateSource
  build: BuildInfo
}

export interface PreparedBuild {
  root: string
  build: BuildInfo
  bun: string
  bunPath: string
}

export interface PrepareOptions {
  source: UpdateSource
  force: boolean
}

export interface UpdaterDeps {
  home: string
  hostRoot: string
  app: HostApp
  runtimes: Pick<Runtimes, 'swap' | 'live'>
  drainTimeout: number
  current(): Promise<BuildInfo>
  find(current: BuildInfo): Promise<FoundUpdate | undefined>
  source(id: string): Promise<UpdateSource | undefined>
  prepare(bytes: Uint8Array, options: PrepareOptions): Promise<PreparedBuild>
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
  apply(source: string, build: string): Promise<UpdateState>
  repair(source: string): Promise<UpdateState & { target: BuildInfo }>
  start(): void
  stop(): void
}

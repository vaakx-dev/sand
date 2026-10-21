import type { DeviceInfo } from '@sand/host-devices/contract'
import type { ServerInfo } from '@sand/host-gateway/contract'
import type { Request } from '@sand/host-hub/contract'
import { event, service } from 'drydock'

export interface HostOptions {
  home: string
  main: string
  port: number
  watch: boolean
  drainTimeout: number
  device: DeviceInfo
}

export interface HostApp {
  root(): string
  main(): string
  use(root: string): void
}

export interface DaemonTarget {
  url: string
  key: string
}

export interface DaemonRequestOptions {
  to?: DaemonTarget
  timeout?: number
}

export interface DaemonLaunch {
  info: ServerInfo
  started: boolean
}

export interface Daemon {
  info(): Promise<ServerInfo | undefined>
  require(hint?: string): Promise<ServerInfo>
  ensure(options?: { safe?: boolean }): Promise<DaemonLaunch>
  start(): Promise<ServerInfo>
  stop(): Promise<void>
  request<I, O>(request: Request<I, O>, input: I, options?: DaemonRequestOptions): Promise<O>
}

export const daemon = service<Daemon>('daemon')
export const hostOptions = service<HostOptions>('hostOptions')
export const hostApp = service<HostApp>('hostApp')

export const hostStop = event<() => void>('host.stop')
export const hostRestart = event<() => void>('host.restart')

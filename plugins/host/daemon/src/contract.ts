import type { PcIdentity } from '@sand/devices-contract'
import type { ServerInfo } from '@sand/host-gateway/contract'
import { type Request, request, type, type WireEvent } from '@sand/host-hub/contract'
import { type Dispose, event, service } from 'drydock'
import { z } from 'zod'

export interface HostOptions {
  home: string
  main: string
  port: number
  watch: boolean
  drainTimeout: number
  name?: string
}

export interface HostApp {
  root(): string
  main(): string
  use(root: string): void
}

export interface DaemonRequestOptions {
  timeout?: number
}

export interface DaemonLaunch {
  info: ServerInfo
  started: boolean
}

export interface DaemonLink {
  readonly pc: PcIdentity
  call<I, O>(request: Request<I, O>, input: I, options?: DaemonRequestOptions): Promise<O>
  on<P>(event: WireEvent<P>, listener: (payload: P) => void): Dispose
  closed(): Promise<void>
  close(): void
}

export interface Daemon {
  info(): Promise<ServerInfo | undefined>
  require(hint?: string): Promise<ServerInfo>
  ensure(options?: { safe?: boolean }): Promise<DaemonLaunch>
  start(): Promise<ServerInfo>
  stop(): Promise<number | undefined>
  request<I, O>(request: Request<I, O>, input: I, options?: DaemonRequestOptions): Promise<O>
  link(): Promise<DaemonLink>
}

export const daemon = service<Daemon>('daemon')

export const daemonStop = request('daemon.stop', { input: z.object({}), output: type<void>() })
export const hostOptions = service<HostOptions>('hostOptions')
export const hostApp = service<HostApp>('hostApp')

export const hostStop = event<() => void>('host.stop')
export const hostRestart = event<() => void>('host.restart')

import type { Dispose } from 'drydock'
import type { PairBack, PairedDevice, PairRequest, TailscaleState } from './devices'
import type { FailedPlugin, HostHealthCheck, RuntimeHealth } from './health'
import type { BuildInfo, DeviceInfo, Remote } from './remotes'
import type { RuntimeActivity, RuntimeReason } from './runtime'
import type { WireHandler } from './server'
import type { WireEvent, WireRequestType } from './wire'

export interface HostOptions {
  home: string
  main: string
  port: number
  watch: boolean
  drainTimeout: number
  device: DeviceInfo
}

export type RuntimeState = 'ready' | 'draining'

export interface RuntimeView {
  readonly id: string
  readonly pid: number
  readonly url: string
  readonly secret: string
  readonly state: RuntimeState
  readonly activity: RuntimeActivity
  readonly failed: readonly FailedPlugin[]
}

export interface HostStatus {
  pid: number
  runtime: RuntimeHealth
  error?: string
  failed?: FailedPlugin[]
  draining: number
}

export interface Runtimes {
  current(): RuntimeView | undefined
  live(): RuntimeView[]
  wait(timeout: number): Promise<RuntimeView | undefined>
  swap(reason: RuntimeReason): Promise<boolean>
  status(): HostStatus
}

export interface HubSocket {
  send(data: string): void
  close(): void
}

export interface Hub {
  open(socket: HubSocket, device: string): void
  message(socket: HubSocket, raw: string): void
  close(socket: HubSocket): void
  disconnect(device: string): void
  devices(): string[]
  broadcast(event: WireEvent): void
  handle<K extends WireRequestType>(type: K, handler: WireHandler<K>): Dispose
}

export interface DeviceRemoval {
  device: PairedDevice
  told: boolean
}

export interface HostDevices {
  list(): PairedDevice[]
  get(id: string): PairedDevice | undefined
  verify(key: string): PairedDevice | undefined
  invite(): { secret: string; expires: number }
  redeem(request: PairRequest): Promise<{ device: PairedDevice; key: string } | undefined>
  mint(peer: DeviceInfo): Promise<string>
  link(id: string, peer: DeviceInfo): Promise<PairedDevice | undefined>
  rename(id: string, name: string): Promise<PairedDevice>
  remove(id: string, options?: { told?: boolean }): Promise<void>
  onChange(listener: (removed?: DeviceRemoval) => void): Dispose
}

export interface HttpCall {
  request: Request
  url: URL
  device?: string
  admin: boolean
  address?: string
}

export interface HttpRoute {
  method: 'GET' | 'POST'
  handle(call: HttpCall): Response | Promise<Response>
}

export interface HostHttp {
  route(path: string, route: HttpRoute): Dispose
  urls(): string[]
}

export interface HostBundle {
  build: BuildInfo
  bytes: Uint8Array<ArrayBuffer>
}

export interface HostBuild {
  info(): Promise<BuildInfo>
}

export interface HostApp {
  root(): string
  main(): string
  use(root: string): void
}

export interface HostRemotes {
  list(): Remote[]
  add(link: string): Promise<Remote>
  accept(back: PairBack, address?: string): Promise<boolean>
}

export interface HostTailscale {
  state(): TailscaleState
  refresh(): Promise<TailscaleState>
  setHttps(on: boolean): Promise<TailscaleState>
}

declare module 'drydock' {
  interface Services {
    hostOptions: HostOptions
    runtimes: Runtimes
    hub: Hub
    hostDevices: HostDevices
    tailscale: HostTailscale
    hostHttp: HostHttp
    hostBuild: HostBuild
    hostApp: HostApp
    hostRemotes: HostRemotes
    hostHealth: HostHealthCheck
  }

  interface Events {
    'host.runtimes': () => void
    'host.event': (event: WireEvent) => void
    'host.tailscale': (state: TailscaleState) => void
    'host.stop': () => void
    'host.restart': () => void
  }
}

import type { Hello, hello, InputOf, Request } from '@sand/host-hub/contract'
import type { Dispose } from 'drydock'
import type { PcIdentity } from '../records'
import type { PcRoutes, Route, RoutePrefs } from './routes'
import type { ConnectionStatus, Diagnosis } from './status'

export interface Signer {
  publicKey: string
  sign(payload: string): string
}

export interface ConnectTarget {
  id: string
  name?: string
  publicKey?: string
}

export interface TransportInit {
  method?: string
  headers?: Record<string, string>
  body?: BodyInit
  signal?: AbortSignal
  timeout: number
}

export interface SocketHandlers {
  message(data: string): void
  closed(reason: string): void
}

export interface TransportSocket {
  send(data: string): void
  close(): void
}

export interface Transport {
  fetch(path: string, init: TransportInit): Promise<Response>
  socket(path: string, handlers: SocketHandlers, timeout: number): Promise<TransportSocket>
}

export interface Transports {
  direct(url: string): Transport
  via(pc: string): Transport
}

export interface WakeSource {
  online(): boolean
  onWake(listener: (cause: string) => void): Dispose
}

export interface RouteStore {
  load(pc: string): PcRoutes | undefined
  save(pc: string, routes: PcRoutes): void
}

export interface ConnectOptions {
  target: ConnectTarget
  seeds: Route[]
  signer: Signer
  transports: Transports
  wake: WakeSource
  store: RouteStore
  secure: boolean
  visible(): boolean
  greeting(): InputOf<typeof hello>
  greeted(reply: Hello, retagged: boolean): void
  event(name: string, payload: unknown): void
  changed(): void
  identified?(identity: PcIdentity): void
}

export interface CallOptions {
  timeout?: number
}

export interface PcConnection {
  readonly pc: string
  status(): ConnectionStatus
  diagnosis(): Diagnosis
  identity(): PcIdentity | undefined
  tag(): string | undefined
  call<I, O>(request: Request<I, O>, input: I, options?: CallOptions): Promise<O>
  fetch(path: string, init?: RequestInit, options?: CallOptions): Promise<Response>
  retry(): void
  setPrefs(prefs: RoutePrefs): void
  addRoute(url: string): void
  removeRoute(key: string): void
  close(): void
}

export type Connect = (options: ConnectOptions) => PcConnection

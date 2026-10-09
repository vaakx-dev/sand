import type { Hello, WireRequest } from '../wire'

export type WireState = 'connecting' | 'open' | 'closed' | 'unpaired'

export interface WirePairing {
  host: string
  device: string
}

export interface Wire {
  state(): WireState
  retryAt(): number | undefined
  reconnect(): void
  hello(): Hello | undefined
  pairing(): WirePairing | undefined
  call<T = unknown>(request: WireRequest, device?: string): Promise<T>
  fetch(path: string, init?: RequestInit, device?: string): Promise<Response>
}

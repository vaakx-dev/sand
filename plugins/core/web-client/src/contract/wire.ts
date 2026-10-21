import type { HelloField, Request, WireEvent } from '@sand/host-hub/contract'
import type { Dispose } from 'drydock'

export type WireState = 'connecting' | 'open' | 'closed' | 'unpaired'

export interface WirePairing {
  host: string
  device: string
}

export interface WireListen {
  remotes?: boolean
}

export type WireListener<P> = (payload: P, device: string) => void

export interface Wire {
  state(): WireState
  pairing(): WirePairing | undefined
  call<I, O>(request: Request<I, O>, input: I, device?: string): Promise<O>
  on<P>(event: WireEvent<P>, listener: WireListener<P>, options?: WireListen): Dispose
  hello<T>(field: HelloField<T>, device?: string): T | undefined
  fetch(path: string, init?: RequestInit, device?: string): Promise<Response>
}

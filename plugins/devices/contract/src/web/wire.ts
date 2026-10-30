import type { HelloField, Request, WireEvent } from '@sand/host-hub/contract'
import { type Dispose, event, service } from 'drydock'
import type { CallOptions } from '../connection/engine'

export type WireListener<P> = (payload: P, pc: string) => void

export interface WireListen {
  from?: 'home' | 'all'
}

export interface Wire {
  ready(pc?: string): boolean
  call<I, O>(request: Request<I, O>, input: I, pc?: string, options?: CallOptions): Promise<O>
  on<P>(event: WireEvent<P>, listener: WireListener<P>, options?: WireListen): Dispose
  hello<T>(field: HelloField<T>, pc?: string): T | undefined
  fetch(path: string, init?: RequestInit, pc?: string, options?: CallOptions): Promise<Response>
  url(path: string, pc?: string): string
}

export const wire = service<Wire>('wire')

export const wireHello = event<() => void>('wire.hello')

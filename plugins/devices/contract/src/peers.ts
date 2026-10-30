import type { BuildInfo } from '@sand/host-dist/contract'
import { type HelloField, type Request, request, type, type WireEvent, wireEvent } from '@sand/host-hub/contract'
import { type Dispose, service } from 'drydock'
import { z } from 'zod'
import type { CallOptions } from './connection/engine'
import type { Diagnosis } from './connection/status'

export interface PeerView extends Diagnosis {
  id: string
  name: string
  platform?: string
  build?: BuildInfo
}

export type PeerOutcome<O> = { pc: string; ok: true; value: O } | { pc: string; ok: false; error: unknown }

export interface Peers {
  list(): PeerView[]
  get(pc: string): PeerView | undefined
  connected(): string[]
  call<I, O>(pc: string, request: Request<I, O>, input: I, options?: CallOptions): Promise<O>
  callEach<I, O>(request: Request<I, O>, input: I, options?: CallOptions): Promise<PeerOutcome<O>[]>
  fetch(pc: string, path: string, init?: RequestInit, options?: CallOptions): Promise<Response>
  on<P>(event: WireEvent<P>, listener: (payload: P, pc: string) => void): Dispose
  hello<T>(field: HelloField<T>, pc: string): T | undefined
  directUrl(pc: string): string | undefined
  retry(pc?: string): void
  onOpen(listener: (pc: string) => void): Dispose
  onChange(listener: () => void): Dispose
}

export const peers = service<Peers>('peers')

export const peersList = request('peers.list', { input: z.object({}), output: type<PeerView[]>() })
export const peersChange = wireEvent<PeerView[]>('peers.change')

export const peersAnnounce = request('peers.announce', {
  input: z.object({ routes: z.array(z.object({ url: z.string().min(1), kind: z.enum(['local', 'lan', 'tailscale']) })).max(32) }),
  output: type<void>(),
  callers: 'pc',
})

export const connectionPing = request('connection.ping', { input: z.object({}), output: type<{ at: number }>(), callers: 'any' })

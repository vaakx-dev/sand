import { type HelloField, type Request, request, type, type WireEvent, wireEvent } from '@sand/host-hub/contract'
import type { BuildInfo } from '@sand/util/release'
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

interface NamedPc {
  id: string
  name: string
}

export const findPc = <P extends NamedPc>(pcs: P[], name: string) => pcs.find(pc => pc.id === name || pc.name.toLowerCase() === name.toLowerCase())

export const noSuchPc = (pcs: NamedPc[], name: string) => `No paired PC is called ${name}. Paired PCs: ${pcs.map(pc => pc.name).join(', ') || 'none'}`

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

export interface PeerRoutes {
  add(pc: string, url: string): Dispose
  advertise(pc: string, url: string): Dispose
}

export const peerRoutes = service<PeerRoutes>('peerRoutes')

export const peersList = request('peers.list', { input: z.object({}), output: type<PeerView[]>() })
export const peersChange = wireEvent<PeerView[]>('peers.change')

export const peersAnnounce = request('peers.announce', {
  input: z.object({ routes: z.array(z.object({ url: z.string().min(1), kind: z.enum(['local', 'lan', 'tailscale']) })).max(32) }),
  output: type<void>(),
  callers: 'pc',
})

export const connectionPing = request('connection.ping', { input: z.object({}), output: type<{ at: number }>(), callers: 'any' })

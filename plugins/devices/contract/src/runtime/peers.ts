import { request, type, wireEvent } from '@sand/host-hub/contract'
import { z } from 'zod'
import type { ConnectionStatus } from '../connection/status'
import type { PeerView } from '../peers'
import { viaMethods } from '../via'

export interface UnavailablePc {
  pc: string
  name: string
  status: ConnectionStatus
}

export type RelayOutcome<T> = { ok: true; value: T } | { ok: false; unavailable: UnavailablePc }

export interface RelayHead {
  status: number
  headers: Record<string, string>
  streamed: boolean
}

export type RelayChunk = { stream: string; data: string } | { stream: string; done: true } | { stream: string; error: string }

const pc = z.string().min(1)
const stream = z.string().min(1)
const timeout = z.number().int().positive().optional()

export const peersState = request('peers.state', { input: z.object({}), output: type<PeerView[]>(), callers: 'runtime' })
export const peersListen = request('peers.listen', { input: z.object({ events: z.array(z.string().min(1)) }), output: type<void>(), callers: 'runtime' })
export const peersRetry = request('peers.retry', { input: z.object({ pc: pc.optional() }), output: type<void>(), callers: 'runtime' })

export const peersRelay = request('peers.relay', {
  input: z.object({ pc, request: z.string().min(1), input: z.unknown(), timeout }),
  output: type<RelayOutcome<unknown>>(),
  callers: 'runtime',
})

export const peersRelayFetch = request('peers.relayFetch', {
  input: z.object({
    pc,
    stream,
    path: z.string().startsWith('/'),
    method: z.enum(viaMethods),
    headers: z.record(z.string(), z.string()),
    body: z.object({ data: z.string(), encoding: z.enum(['utf8', 'base64']) }).optional(),
    timeout,
  }),
  output: type<RelayOutcome<RelayHead>>(),
  callers: 'runtime',
})

export const peersRelayCancel = request('peers.relayCancel', { input: z.object({ stream }), output: type<void>(), callers: 'runtime' })

export const peersOpened = wireEvent<string>('peers.opened')
export const peersEvent = wireEvent<{ pc: string; name: string; payload: unknown }>('peers.event')
export const peersChunk = wireEvent<RelayChunk>('peers.chunk')

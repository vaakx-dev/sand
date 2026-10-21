import type { RouteCaller } from '@sand/host-gateway/contract'
import { request, type, wireEvent, type WireEvent } from '@sand/host-hub/contract'
import { event, service } from 'drydock'
import { z } from 'zod'

export type RuntimeHealth = 'starting' | 'ready' | 'failed' | 'restarting'

export type RuntimeAccess = 'denied' | 'public' | 'client'

export type RuntimeReason = 'start' | 'reload' | 'watch' | 'crash' | 'plugins' | 'update' | 'safe'

export type RuntimeState = 'ready' | 'draining'

export interface FailedPlugin {
  id: string
  error: string
}

export interface HostStatus {
  pid: number
  runtime: RuntimeHealth
  error?: string
  failed?: FailedPlugin[]
  draining: number
}

export interface RuntimeActivity {
  sessions: string[]
}

export interface RuntimeChange {
  id: string
  reason: RuntimeReason
}

export type RuntimeMessage =
  | { type: 'ready'; url: string; failed: FailedPlugin[] }
  | { type: 'failed'; failed: FailedPlugin[] }
  | { type: 'activity'; activity: RuntimeActivity }
  | { type: 'swap' }
  | { type: 'drained' }

export type HostMessage = { type: 'promote'; held: string[] } | { type: 'drain' } | { type: 'release'; sessions: string[] }

export interface Runtime {
  id: string
  access(request: Request): RuntimeAccess
  caller(request: Request): RouteCaller | undefined
  listening(url: string): void
  swap(): void
  owns(session: string): boolean
}

export interface RuntimeView {
  readonly id: string
  readonly pid: number
  readonly url: string
  readonly secret: string
  readonly state: RuntimeState
  readonly activity: RuntimeActivity
  readonly failed: readonly FailedPlugin[]
}

export interface Runtimes {
  current(): RuntimeView | undefined
  live(): RuntimeView[]
  wait(timeout: number): Promise<RuntimeView | undefined>
  swap(reason: RuntimeReason): Promise<boolean>
  status(): HostStatus
}

export const runtimes = service<Runtimes>('runtimes')
export const runtime = service<Runtime>('runtime')

export const hostRuntimes = event<() => void>('host.runtimes')
export const hostEvent = event<(event: WireEvent<unknown>, payload: unknown) => void>('host.event')
export const runtimeDrain = event<() => void>('runtime.drain')
export const runtimeRelease = event<(sessions: string[]) => void>('runtime.release')

export const runtimesSafe = request('runtimes.safe', { input: z.object({ on: z.boolean() }), output: type<boolean>() })

export const runtimeChanged = wireEvent<RuntimeChange>('runtime.changed')
export const runtimeFailed = wireEvent<string>('runtime.failed')

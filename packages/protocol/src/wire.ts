import type { RuntimeChange } from './runtime'

export interface WireRequests {
  hello: { since: string | null; known?: string }
  'git.branches': { cwds: string[] }
}

export interface WireEvents {
  'runtime.changed': [change: RuntimeChange]
  'runtime.failed': [error: string]
}

export interface HelloFields {
  safe?: boolean
  tag?: string
  same?: boolean
}

export type Hello = HelloFields

export type WireRequestType = keyof WireRequests

export type WireRequest = { [K in WireRequestType]: { type: K } & WireRequests[K] }[WireRequestType]

export type WireRequestOf<K extends WireRequestType> = Extract<WireRequest, { type: K }>

export type ClientMessage = WireRequest & { id: number }

export type ServerMessage =
  | { type: 'result'; id: number; result?: unknown; error?: string }
  | { type: 'event'; name: string; args: unknown[] }

export type WireEventName = keyof WireEvents

export type WireEvent = { [K in WireEventName]: { name: K; args: WireEvents[K] } }[WireEventName]

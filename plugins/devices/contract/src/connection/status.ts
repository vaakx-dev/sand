import type { Route, RouteEntry } from './routes'

export type BlockReason = 'removed' | 'not-paired' | 'wrong-pc' | 'no-route'

export type ConnectionStatus =
  | { phase: 'connecting'; attempt: number }
  | { phase: 'greeting'; route: Route; attempt: number }
  | { phase: 'connected'; route: Route; since: number; latency?: number }
  | { phase: 'reconnecting'; attempt: number; retryAt: number; cause: string }
  | { phase: 'offline' }
  | { phase: 'blocked'; reason: BlockReason; at?: number; by?: string }

export type ConnectionPhase = ConnectionStatus['phase']

export type Freshness = { state: 'live' } | { state: 'checking'; heard: number } | { state: 'stale'; heard?: number }

export type AttemptResult = 'ok' | 'timeout' | 'refused' | 'wrong-pc' | 'blocked-https' | 'not-allowed' | 'error'

export interface Attempt {
  route: Route
  result: AttemptResult
  at: number
  ms?: number
  error?: string
}

export interface Diagnosis {
  status: ConnectionStatus
  routes: RouteEntry[]
  attempts: Attempt[]
}

import type { FailedPlugin } from './health'
import type { RouteCaller } from './server'
import type { WireJob } from './wire'

export type RuntimeAccess = 'denied' | 'public' | 'client'

export type RuntimeReason = 'start' | 'reload' | 'watch' | 'crash' | 'plugins' | 'update'

export interface RuntimeActivity {
  sessions: string[]
  jobs: WireJob[]
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

export type HostMessage = { type: 'drain' } | { type: 'release'; sessions: string[] }

export interface Runtime {
  id: string
  access(request: Request): RuntimeAccess
  caller(request: Request): RouteCaller | undefined
  listening(url: string): void
  swap(): void
}

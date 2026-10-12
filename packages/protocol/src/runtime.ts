import type { RouteCaller } from './server'

export type RuntimeAccess = 'denied' | 'public' | 'client'

export type RuntimeReason = 'start' | 'reload' | 'watch' | 'crash' | 'plugins' | 'update' | 'safe'

export interface FailedPlugin {
  id: string
  error: string
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

declare module './wire' {
  interface WireRequests {
    'runtimes.safe': { on: boolean }
  }
}

declare module 'drydock' {
  interface Services {
    runtime: Runtime
  }

  interface Events {
    'runtime.promote': () => void
    'runtime.drain': () => void
    'runtime.release': (sessions: string[]) => void
  }
}

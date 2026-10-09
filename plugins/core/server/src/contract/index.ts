import type { Entry, Prompt } from '@sand/messages'
import type { SessionSettings } from '@sand/model/contract'
import type { Hello } from '@sand/protocol'
import type { CreateSession, SessionSummary } from '@sand/sessions-sqlite/contract'
import type { RelayContributions, RelayEvents } from './relay'
import type { Server } from './server'
import type { UI } from './ui'

export type * from './relay'
export type * from './server'
export type * from './ui'

declare module 'drydock' {
  interface Services {
    ui: UI
    server: Server
  }

  interface Events {
    'server.hello': (hello: Hello) => Hello
  }
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'sessions.list': {}
    'sessions.create': { options: CreateSession & { id: string } }
    'sessions.branch': { session: string; into: string; at?: string | null }
    'sessions.remove': { session: string }
    'session.open': { session: string }
    'session.append': { session: string; entry: Entry }
    'session.checkout': { session: string; entry: string | null }
    'session.rename': { session: string; title: string; named?: boolean }
    'loop.run': { session: string; prompt: Prompt }
    'loop.interrupt': { session: string }
    'ui.command': { name: string; args: string; session?: string; cwd?: string; settings?: SessionSettings }
    'ui.pick.result': { pick: string; index: number | null; action?: string; query?: string }
    'ui.input.result': { input: string; value: string | null }
    'ui.focus': { session?: string }
  }

  interface WireEvents extends RelayEvents {}

  interface HelloFields {
    sessions: SessionSummary[]
    active: string[]
    relay?: RelayContributions
  }
}

import type { Message } from './message'
import type { SessionSettings } from './settings'

export interface Entry {
  id: string
  session: string
  parent: string | null
  at: number
  type: string
  data: unknown
}

export type SessionKind = 'main' | 'branch' | 'agent'

export interface SessionInfo {
  id: string
  created: number
  cwd: string
  title: string | null
  head: string | null
  parent: string | null
  origin: string | null
  kind: SessionKind
}

export interface SessionMeta {
  pinned: boolean
  settled: number | null
  seen: number
  position: number
}

export interface SessionSummary extends SessionInfo, Partial<SessionMeta> {
  updated: number
  messages: number
  named: boolean
}

export interface Session extends SessionInfo {
  append(type: string, data: unknown, id?: string): Entry
  path(): Entry[]
  entries(): Entry[]
  messages(): Message[]
  checkout(entry: string | null): void
  rename(title: string, named?: boolean): void
}

export interface CreateSession {
  id?: string
  cwd: string
  title?: string
  parent?: string
  origin?: string
  kind?: SessionKind
  settings?: SessionSettings
}

export interface Sessions {
  create(options: CreateSession): Session
  open(id: string): Session | undefined
  branch(session: Session, id?: string, at?: string | null): Session
  list(): SessionSummary[]
  remove(id: string): void
  entriesOfType?(type: string): Entry[]
  fallbackCwd?: string
}

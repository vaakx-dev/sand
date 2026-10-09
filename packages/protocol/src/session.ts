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
  project: string | null
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
  append(type: string, data: unknown, id?: string, at?: number): Entry
  appendMany(entries: Pick<Entry, 'id' | 'type' | 'data' | 'at'>[]): void
  path(): Entry[]
  entries(): Entry[]
  messages(): Message[]
  checkout(entry: string | null): void
  rename(title: string, named?: boolean): void
}

export interface ThreadLink {
  device: string
  name: string
  session: string
}

export interface ThreadLinkEntries {
  'continued-from': ThreadLink
  'continued-to': ThreadLink
}

export interface ThreadExportPage {
  title: string | null
  cwd: string
  scratch: boolean
  entries: Entry[]
  next: number | null
}

export type ThreadImportResult = { session: string } | { missing: string }

export interface CreateSession {
  id?: string
  cwd?: string
  project?: string | null
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
}

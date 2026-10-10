import type { Entry, Message } from '@sand/messages'
import type { SessionSettings } from '@sand/model/contract'

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
  format?: number
}

export interface SessionMeta {
  pinned: boolean
  settled: number | null
  snoozed: number | null
  seen: number
  position: number
}

export interface SessionSummary extends SessionInfo, Partial<SessionMeta> {
  updated: number
  messages: number
  named: boolean
}

export interface PageSize {
  entries?: number
  bytes?: number
}

export interface EntryPage {
  entries: Entry[]
  more: boolean
}

export interface SyncedSummaries {
  sessions: SessionSummary[]
  removed?: string[]
  sync: string
  delta: boolean
}

export interface Session extends SessionInfo {
  append(type: string, data: unknown, id?: string, at?: number): Entry
  appendMany(entries: Pick<Entry, 'id' | 'type' | 'data' | 'at'>[]): void
  path(): Entry[]
  page(before?: string | null, size?: PageSize): EntryPage
  since(after: string): Entry[] | undefined
  carried(before: string, types: string[]): Entry[]
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
  format: number
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
  synced(since: string | null, active: string[]): SyncedSummaries
  children(parent: string): SessionSummary[]
  remove(id: string): void
  entriesOfType?(type: string): Entry[]
  readonly format: number
  upgrade(entries: Entry[], from: number): Entry[]
}

export type SessionMetaUpdate = SessionMeta & { id: string }

export interface WireSession {
  $session: SessionInfo
}

export interface WireSessionRef {
  $session: Pick<SessionInfo, 'id'>
}

declare module 'drydock' {
  interface Services {
    sessions: Sessions
  }

  interface Events {
    'session.entry': (session: Session, entry: Entry) => void
    'session.update': (session: Session) => void
    'session.remove': (session: Session) => void
  }
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'session.pin': { session: string; pinned: boolean }
    'session.settle': { session: string; settled: boolean }
    'session.snooze': { session: string; until: number | null }
    'session.seen': { session: string; at: number }
    'session.move': { session: string; position: number }
  }

  interface WireEvents {
    'session.entry': [session: WireSession, entry: Entry]
    'session.update': [session: WireSession]
    'session.remove': [session: WireSession]
    'session.meta': [meta: SessionMetaUpdate]
  }

  interface HelloFields {
    scratch?: string
  }
}

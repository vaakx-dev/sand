import type { AppendMeta, Entry } from './entry'
import type { Message } from './message'

export type ChatKind = 'thread' | 'agent' | 'quick'

export interface SessionInfo {
  id: string
  created: number
  cwd: string
  project: string | null
  head: string | null
  kind: ChatKind
  parent: string | null
  origin: string | null
  title: string
  seen: boolean
  pinned: boolean
  settled: number | null
  snoozed: number | null
  position: number | null
}

export type ChatPatch = Partial<Pick<SessionInfo, 'title' | 'seen' | 'pinned' | 'settled' | 'snoozed' | 'position'>>

export interface NewAgent {
  parent: string
  title: string
  origin?: string
}

export interface NewThread {
  project?: string | null
}

export interface Relocation {
  cwd: string
  project: string | null
  note: string
}

export interface SessionSummary extends SessionInfo {
  updated: number
  messages: number
}

export interface PageSize {
  entries?: number
  bytes?: number
}

export interface EntryPage {
  entries: Entry[]
  more: boolean
}

export interface Branch {
  entry: string
  leaf: string
}

export interface SyncedSummaries {
  sessions: SessionSummary[]
  sync: string
  delta: boolean
}

export interface Session extends SessionInfo {
  owner: 'thread'
  append(type: string, data: unknown, meta?: AppendMeta): Entry
  path(): Entry[]
  page(before?: string | null, size?: PageSize): EntryPage
  since(after: number | string): Entry[] | undefined
  carried(before: string, types: string[]): Entry[]
  latest(type: string): Entry | undefined
  branches(entry: string): Branch[]
  entries(): Entry[]
  messages(): Message[]
  checkout(entry: string | null): void
}

export interface Sessions {
  thread(cwd: string, options?: NewThread): Session
  quick(): Session
  agent(spec: NewAgent): Session
  children(parent: string): SessionSummary[]
  update(id: string, patch: ChatPatch): Session
  relocate(id: string, relocation: Relocation): Promise<Session>
  rename(id: string, title: string): void
  pin(id: string, pinned: boolean): Session
  settle(id: string, settled: boolean): Promise<Session>
  snooze(id: string, until: number | null): Session
  move(id: string, position: number): Session
  remove(id: string): Promise<void>
  open(id: string): Session | undefined
  require(id: string): Session
  list(): SessionSummary[]
  synced(since: string | null, active: string[]): SyncedSummaries
  entriesOfType(type: string): Entry[]
}

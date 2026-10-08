import type { ContextUsage, Pending, TurnResult } from '../loop'
import type { ToolResultBlock } from '../message'
import type { Entry, SessionSummary } from '../session'
import type { SessionSettings } from '../settings'

export type LiveBlock =
  | { type: 'text' | 'thinking'; index: number; text: string; done?: boolean }
  | { type: 'tool'; index: number; id: string; name: string; input: string }

export interface ToolProgress {
  running: Set<string>
  results: Map<string, ToolResultBlock>
}

export interface Thread {
  id: string
  device?: string
  info: SessionSummary
  entries: Map<string, Entry>
  loaded: boolean
  failed?: string
  running: boolean
  started?: number
  unread: boolean
  live: LiveBlock[]
  tools: ToolProgress
  queued: Pending[]
  followUps: Pending[]
  context?: ContextUsage
  ended?: TurnResult
  version: number
}

export interface NewThread {
  cwd?: string
  device?: string
  title?: string
  settings?: SessionSettings
}

export interface DraftTarget {
  id: string
  cwd: string
  device?: string
}

export interface Threads {
  cwd(): string
  device(): string | undefined
  draft(cwd: string, device?: string, id?: string): Promise<void>
  drafting(): DraftTarget | undefined
  idle(): boolean
  list(): Thread[]
  get(id: string): Thread | undefined
  current(): Thread | undefined
  select(id: string | undefined): Promise<void>
  load(id: string): Promise<Thread | undefined>
  create(options?: NewThread): Promise<Thread>
  path(id: string): Entry[]
  rename(id: string, title: string): Promise<void>
  remove(id: string): Promise<void>
  checkout(id: string, entry: string | null): Promise<void>
  branch(id: string, at?: string | null): Promise<Thread>
  pin(id: string, pinned: boolean): Promise<void>
  settle(id: string, settled: boolean): Promise<void>
  move(id: string, position: number): Promise<void>
}

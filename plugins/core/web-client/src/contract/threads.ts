import type { ContextUsage } from '@sand/compaction/contract'
import type { LiveBlock } from '@sand/llm-accounts/contract'
import type { TurnResult } from '@sand/loops/contract'
import type { Entry, ToolCallBlock, ToolResultBlock } from '@sand/messages'
import type { SessionSettings } from '@sand/model/contract'
import type { SessionSummary } from '@sand/sessions-sqlite/contract'
import type { Pending } from '@sand/steering/contract'

export interface ToolProgress {
  running: Set<string>
  results: Map<string, ToolResultBlock>
}

export interface Thread {
  id: string
  device?: string
  info: SessionSummary
  entries: Map<string, Entry>
  carried?: Entry[]
  complete?: boolean
  cursor?: string
  floor?: string
  loaded: boolean
  cached?: boolean
  failed?: string
  running: boolean
  started?: number
  unread: boolean
  live: LiveBlock[]
  tools: ToolProgress
  step?: ToolCallBlock
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
  path(id: string, options?: { carried?: boolean }): Entry[]
  link(id: string): string
  older(id: string): boolean
  page(id: string): Promise<void>
  findLast(id: string, test: (entry: Entry) => boolean): Promise<Entry | undefined>
  full(id: string): Promise<void>
  children(id: string): Promise<void>
  rename(id: string, title: string): Promise<void>
  remove(id: string): Promise<void>
  checkout(id: string, entry: string | null): Promise<void>
  branch(id: string, at?: string | null): Promise<Thread>
  pin(id: string, pinned: boolean): Promise<void>
  settle(id: string, settled: boolean): Promise<void>
  snooze(id: string, until: number | null): Promise<void>
  move(id: string, position: number): Promise<void>
}

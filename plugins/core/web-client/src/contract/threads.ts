import type { ContextUsage } from '@sand/compaction/contract'
import type { LiveBlock } from '@sand/accounts/contract'
import type { PendingItem, TurnResult, WaitReason } from '@sand/turns-contract/contract'
import type { Branch, Entry, SessionInfo, SessionSummary, ToolCallBlock, ToolResultBlock } from '@sand/chats/contract'
import type { Mark } from '@sand/server/contract'
import type { Dispose } from 'drydock'

export interface ToolProgress {
  running: Set<string>
  results: Map<string, ToolResultBlock>
  logs: Map<string, string[]>
}

export interface Thread {
  id: string
  device: string
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
  turn: boolean
  jobs: Map<string, number>
  started?: number
  waiting?: WaitReason
  live: LiveBlock[]
  mark?: Mark
  tools: ToolProgress
  step?: ToolCallBlock
  pending: PendingItem[]
  context?: ContextUsage
  ended?: TurnResult
  version: number
}

export type ThreadVisit = 'push' | 'replace' | 'restore'

export interface DraftTarget {
  id: string
  cwd: string
  device: string
}

export type ThreadCreator = (target: DraftTarget) => Promise<SessionInfo> | undefined

export interface Threads {
  cwd(): string
  device(): string
  draft(cwd: string, device: string, id?: string, options?: { replace?: boolean }): Promise<void>
  drafting(): DraftTarget | undefined
  list(): Thread[]
  get(id: string): Thread | undefined
  current(): Thread | undefined
  children(id: string): Thread[]
  create(target: Omit<DraftTarget, 'id'> & { id?: string }): Promise<Thread>
  creator(make: ThreadCreator): Dispose
  rename(id: string, title: string): Promise<void>
  pin(id: string, pinned: boolean): Promise<void>
  settle(id: string, settled: boolean): Promise<void>
  snooze(id: string, until: number | null): Promise<void>
  move(id: string, position: number): Promise<void>
  remove(id: string): Promise<void>
  select(id: string | undefined, options?: { replace?: boolean }): Promise<void>
  watch(id: string): Dispose
  load(id: string): Promise<Thread | undefined>
  path(id: string, options?: { carried?: boolean }): Entry[]
  link(id: string): string
  older(id: string): boolean
  page(id: string): Promise<void>
  findLast(id: string, test: (entry: Entry) => boolean): Promise<Entry | undefined>
  full(id: string): Promise<void>
  checkout(id: string, entry: string | null): Promise<void>
  branches(id: string, entry: string): Promise<Branch[]>
}

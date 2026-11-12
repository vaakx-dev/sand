import type { ContextUsage } from '@sand/compaction/contract'
import type { LiveBlock } from '@sand/accounts/contract'
import type { PendingItem, TurnResult, WaitReason } from '@sand/turns-contract/contract'
import type { Branch, Entry, Prompt, SessionSummary, ToolCallBlock, ToolResultBlock } from '@sand/chats/contract'
import type { SessionSettings } from '@sand/model/contract'
import type { InputOf } from '@sand/host-hub/contract'
import type { threadUpdate } from '@sand/orchestrator/contract'
import type { Mark } from '@sand/server/contract'
import type { Dispose } from 'drydock'
import type { OutboxItem } from './outbox'

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
  sending: OutboxItem[]
  context?: ContextUsage
  ended?: TurnResult
  version: number
}

export interface DraftTarget {
  id: string
  cwd: string
  device: string
}

export type OpenChat = { thread: string } | { draft: string }

export interface FirstMessage {
  prompt: Prompt
  label: string
  settings: SessionSettings
}


export type ThreadChange = Omit<InputOf<typeof threadUpdate>, 'session'>

export interface Threads {
  cwd(): string
  device(): string
  plan(target: Omit<DraftTarget, 'id'> & { id?: string }): DraftTarget
  show(chat: OpenChat): void
  drafting(): DraftTarget | undefined
  list(): Thread[]
  get(id: string): Thread | undefined
  current(): Thread | undefined
  children(id: string): Thread[]
  start(draft: DraftTarget, first: FirstMessage): Promise<void>
  update(id: string, change: ThreadChange): Promise<void>
  remove(id: string): Promise<void>
  watch(id: string): Dispose
  load(id: string): Promise<Thread | undefined>
  path(id: string, options?: { carried?: boolean }): Entry[]
  older(id: string): boolean
  page(id: string): Promise<void>
  findLast(id: string, test: (entry: Entry) => boolean): Promise<Entry | undefined>
  full(id: string): Promise<void>
  checkout(id: string, entry: string | null): Promise<void>
  branches(id: string, entry: string): Promise<Branch[]>
}

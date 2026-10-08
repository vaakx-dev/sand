import type { LLMRequest, StopReason, Usage } from './llm'
import type { Prompt } from './message'
import type { Session } from './session'

export interface TurnResult {
  stopReason: StopReason | 'interrupted' | 'error'
  usage: Usage
  text: string
  error?: string
}

export interface UsageRecord {
  id?: string
  model?: string
  usage: Usage
}

export interface Pending {
  id: string
  label: string
  prompt: Prompt
  at: number
}

export interface Loop {
  run(session: Session, prompt: Prompt, signal?: AbortSignal): Promise<TurnResult>
  steer(session: Session, prompt: Prompt, label?: string): string | undefined
  unsteer(session: Session, id: string): boolean
  steers(session: Session): Pending[]
  interrupt(session: Session): boolean
  active(session: Session): boolean
}

export interface FollowUps {
  list(session: Session): Pending[]
  add(session: Session, prompt: Prompt, label?: string): Pending
  remove(session: Session, id: string): boolean
  edit(session: Session, id: string, prompt: Prompt, label?: string): boolean
  move(session: Session, id: string, index: number): boolean
  send(session: Session, id: string): boolean
}

export interface QueueState {
  steers: Pending[]
  followUps: Pending[]
}

export interface ContextUsage {
  used: number
  limit: number
  window: number
  compacting?: boolean
}

export type CompactionReason = 'manual' | 'threshold' | 'overflow'

export interface CompactedFiles {
  read: string[]
  modified: string[]
}

export interface CompactionRecord {
  summary: string
  keep: string | null
  pinned?: string
  reason?: CompactionReason
  before?: number
  after?: number
  files?: CompactedFiles
}

export interface ContextBuilder {
  build(session: Session): Promise<LLMRequest>
}

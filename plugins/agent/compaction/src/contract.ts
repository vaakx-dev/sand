import type { Conversation } from '@sand/engine/contract'
import { request, type, wireEvent } from '@sand/host-hub/contract'
import { event, service } from 'drydock'
import { z } from 'zod'

export interface ContextParts {
  system: number
  tools: number
  conversation: number
  results: number
}

export interface ContextUsage {
  used: number
  limit: number
  window: number
  compacting?: boolean
  parts?: ContextParts
}

export type CompactionReason = 'threshold' | 'overflow' | 'idle'

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
  thread?: string
}

export interface CompactionBrief {
  format(): Promise<string>
  check?(reply: string): string | undefined
  accept(reply: string): Promise<string>
}

export const compactionBrief = event<(conversation: Conversation) => CompactionBrief | undefined>('compaction.brief')

export interface ContextLimits {
  limit(model: string): number
}

export const contextLimits = service<ContextLimits>('contextLimits')

export const contextUsage = event<(conversation: Conversation, usage: ContextUsage) => void>('context.usage')

export const contextChange = wireEvent<[session: string, usage: ContextUsage]>('context.change')

export const contextGet = request('context.get', { input: () => z.object({ session: z.string(), owner: z.enum(['thread', 'bot']) }), output: type<ContextUsage | undefined>(), place: 'thread' })

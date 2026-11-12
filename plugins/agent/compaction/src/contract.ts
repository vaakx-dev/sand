import type { LLMRequest, Usage } from '@sand/accounts/contract'
import type { Conversation } from '@sand/engine/contract'
import { request, type, wireEvent } from '@sand/host-hub/contract'
import { event, service, type Dispose } from 'drydock'
import { z } from 'zod'

export type ContextTone = 'violet' | 'orange' | 'sky' | 'info' | 'accent' | 'success'

export interface ContextPart {
  name: string
  tone: ContextTone
  size: number
}

export interface ContextUsage {
  used: number
  limit: number
  window: number
  compacting?: boolean
  parts: ContextPart[]
}

export interface SystemPart {
  name: string
  tone: ContextTone
  chars(system: string): number
}

export interface SystemParts {
  add(part: SystemPart): Dispose
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
  prepare?(request: LLMRequest): Promise<Usage | undefined>
  format(): Promise<string>
  check?(reply: string): string | undefined
  accept(reply: string): Promise<string>
}

export const compactionBrief = event<(conversation: Conversation) => CompactionBrief | undefined>('compaction.brief')

export interface ContextLimits {
  limit(model: string): number
}

export const contextLimits = service<ContextLimits>('contextLimits')

export const systemParts = service<SystemParts>('systemParts')

export const sectionLength = (system: string, start: string, end: RegExp) => {
  const from = system.indexOf(start)
  const found = from < 0 ? null : end.exec(system.slice(from))
  return found ? found.index + found[0].length : 0
}

export const contextUsage = event<(conversation: Conversation, usage: ContextUsage) => void>('context.usage')

export const contextChange = wireEvent<[session: string, usage: ContextUsage]>('context.change')

export const contextGet = request('context.get', { input: () => z.object({ session: z.string(), owner: z.enum(['thread', 'bot']) }), output: type<ContextUsage | undefined>(), place: 'thread' })

export { summaryFormat } from './summarize/format'

import type { Conversation } from '@sand/engine/contract'
import { helloField, request, type, wireEvent } from '@sand/host-hub/contract'
import { event, service, type Dispose } from 'drydock'
import { z } from 'zod'

export type ContextTone = 'violet' | 'orange' | 'danger' | 'info' | 'accent' | 'success'

export interface ContextPart {
  name: string
  tone: ContextTone
  size: number
}

export interface ContextUsage {
  used: number
  limit?: number
  window?: number
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

export type CompactionReason = 'threshold' | 'overflow' | 'idle' | 'manual'

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

export interface ContextLimits {
  limit(window: number): number
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

export interface Compacted {
  before: number
  after: number
}

const chat = () => z.object({ session: z.string(), owner: z.enum(['thread', 'bot']) })

export const contextGet = request('context.get', { input: chat, output: type<ContextUsage | undefined>(), place: 'thread' })

export const compactTimeoutMs = 600_000

export const contextCompact = request('context.compact', { input: chat, output: type<Compacted>(), callers: 'any', place: 'thread' })

export interface IdleShares {
  bot: number
  thread: number
}

export const idleShare = () => z.number().gt(0).max(1)

export const idleShareChoices = [0.1, 0.25, 0.5, 0.75] as const

export const helloIdleShares = helloField<IdleShares>('idleCompaction')
export const idleSharesChange = wireEvent<IdleShares>('compaction.idle')
export const idleSharesSet = request('compaction.idle', {
  input: () => z.object({ bot: idleShare(), thread: idleShare() }),
  output: type<IdleShares>(),
  callers: 'any',
})

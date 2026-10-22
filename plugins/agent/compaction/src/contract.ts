import type { Session } from '@sand/chats/contract'
import { request, type, wireEvent } from '@sand/host-hub/contract'
import { event } from 'drydock'
import { z } from 'zod'

export interface ContextUsage {
  used: number
  limit: number
  window: number
  compacting?: boolean
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
}

export const contextUsage = event<(session: Session, usage: ContextUsage) => void>('context.usage')

export const contextChange = wireEvent<[session: string, usage: ContextUsage]>('context.change')

export const contextGet = request('context.get', { input: z.object({ session: z.string() }), output: type<ContextUsage | undefined>() })

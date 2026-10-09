import type { Session } from '@sand/sessions-sqlite/contract'

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

declare module 'drydock' {
  interface Events {
    'context.usage': (session: Session, usage: ContextUsage) => void
  }
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'context.get': { session: string }
  }

  interface WireEvents {
    'context.change': [session: string, usage: ContextUsage]
  }
}

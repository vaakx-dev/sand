import type { Entry } from '@sand/messages'
import type { ThreadLink } from '@sand/sessions-sqlite/contract'

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'thread.export': { session: string; offset: number }
    'thread.stage': { transfer: string; entries: Entry[]; format?: number }
    'thread.import': { transfer: string; cwd?: string; project?: string; title: string | null; named: boolean; from: ThreadLink; pc: string }
    'thread.link': { session: string; to: ThreadLink }
  }
}

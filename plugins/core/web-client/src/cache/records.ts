import type { Entry } from '@sand/messages'
import type { SessionSummary } from '@sand/sessions-sqlite/contract'
import type { Thread } from '../contract'

export interface Meta {
  synced: Record<string, string>
  opened: Record<string, number>
  bytes: Record<string, number>
}

export interface SummaryRecord {
  device: string | null
  info: SessionSummary
}

export interface TailRecord {
  cursor?: string
  complete?: boolean
  floor?: string
  carried?: Entry[]
}

export interface CachedThread {
  tail: TailRecord
  entries: Entry[]
}

export const emptyMeta = (): Meta => ({ synced: {}, opened: {}, bytes: {} })

export const summaryOf = (thread: Thread): SummaryRecord => ({ device: thread.device ?? null, info: thread.info })

export const summaryKey = (thread: Thread) => JSON.stringify(summaryOf(thread))

export const cursorOf = (thread: Thread) =>
  thread.info.head && thread.entries.has(thread.info.head) ? thread.info.head : thread.cursor

export const tailOf = (thread: Thread): TailRecord => ({
  cursor: cursorOf(thread),
  complete: thread.complete,
  floor: thread.floor,
  carried: thread.carried,
})

export const tailKey = (tail: TailRecord) =>
  JSON.stringify([tail.cursor, tail.complete, tail.floor, tail.carried?.map(entry => entry.id)])

export const entrySize = (entry: Entry) => JSON.stringify(entry).length

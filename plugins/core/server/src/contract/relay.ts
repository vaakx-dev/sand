import type { LiveBlock } from '@sand/accounts/contract'
import type { Entry, SessionInfo } from '@sand/chats/contract'
import type { SettingsState } from '@sand/model/contract'
import type { QueueState } from '@sand/steering/contract'

export interface LiveSnapshot {
  live: LiveBlock[]
  tools: string[]
}

export type EntryHead = Omit<Entry, 'data'>

export interface OpenedSession extends Partial<LiveSnapshot> {
  info: SessionInfo
  entries: Entry[]
  partial?: boolean
  carried?: Entry[]
  queue?: QueueState
  settings?: SettingsState
}

import type { UsageRecord } from '@sand/accounts/contract'
import type { Entry, Session, Sessions } from '@sand/chats/contract'
import { type Morning, type MorningEntry, morningEntry, runEntry } from './contract'

const SCANNED = 20

const newestFirst = (entries: Entry[]) => entries.toReversed()

export const recentMessages = (chat: Session) => newestFirst(chat.page(null, { entries: SCANNED }).entries.filter(entry => entry.type === 'message'))

export const runsIn = (sessions: Sessions, chat: Session) => newestFirst(sessions.entriesIn(chat.id, runEntry))

export const usageSince = (sessions: Sessions, chat: Session, at: number) => sessions.entriesIn(chat.id, 'usage', at).map(entry => entry.data as UsageRecord)

export const morningIn = (chat: Session): Morning | undefined => {
  const entry = chat.latest(morningEntry)
  return entry && { entry: entry.id, at: entry.at, ...(entry.data as MorningEntry) }
}

import type { Entry } from '@sand/messages'
import type { Sessions } from '@sand/sessions-sqlite/contract'

export const acceptFormat = (sessions: Sessions, entries: Entry[], format = 1) => {
  if (format > sessions.format) throw new Error(`This thread comes from a newer sand (log format ${format}). Update sand on this PC first.`)
  return format < sessions.format ? sessions.upgrade(entries, format) : entries
}

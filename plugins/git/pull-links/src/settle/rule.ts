import type { SessionInfo } from '@sand/chats/contract'
import type { StoredLinks } from '../book/record'
import { isLive } from '../links/thread'

export type SettleThread = Pick<SessionInfo, 'kind' | 'settled' | 'pinned' | 'snoozed'>

/**
 * When the last of the thread's pull requests merged or closed, or undefined while one is open or unknown.
 * Links made after their pull request had already ended don't count: they record finished work, not work the thread waits on.
 */
export const allEndedAt = ({ links }: StoredLinks): number | undefined => {
  const counted = links.filter(link => link.ended === undefined || link.ended >= link.linked)
  if (!counted.length) return undefined
  let latest = 0
  for (const { ended } of counted) {
    if (ended === undefined) return undefined
    latest = Math.max(latest, ended)
  }
  return latest
}

/** Whether the thread itself allows settling now: a live thread that isn't pinned or snoozed. Running is checked separately. */
export const mayAutoSettle = (thread: SettleThread, now: number) => isLive(thread) && !thread.pinned && !(thread.snoozed !== null && thread.snoozed > now)

/** Settle once every pull request ended, unless the user wrote in the thread or it was settled since the last one ended. */
export const settlesAt = (links: StoredLinks, held: number): number | undefined => {
  const ended = allEndedAt(links)
  return ended !== undefined && ended > held ? ended : undefined
}

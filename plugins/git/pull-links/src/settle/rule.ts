import type { Session } from '@sand/chats/contract'
import type { StoredLink, StoredLinks } from '../book/record'
import { isLive } from '../links/thread'

const linkedBeforeEnd = (link: StoredLink) => link.ended === undefined || link.ended >= link.linked

export const lastEnd = ({ links }: StoredLinks): number | undefined => {
  const awaited = links.filter(linkedBeforeEnd)
  if (!awaited.length) return undefined
  let latest = 0
  for (const { ended } of awaited) {
    if (ended === undefined) return undefined
    latest = Math.max(latest, ended)
  }
  return latest
}

export const isSettleable = (thread: Session, now: number) => isLive(thread) && !thread.pinned && !(thread.snoozed !== null && thread.snoozed > now)

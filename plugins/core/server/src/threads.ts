import { type ChatPatch, type Session, sessionUpdate, type Sessions } from '@sand/chats/contract'
import type { WireHost } from '@sand/host-hub/contract'
import { joinDisposers } from '@sand/util'
import type { LiveSnapshot } from './contract/relay'
import type { ServerContext } from './context'
import { pagingRequests } from './requests/paging'
import { sessionRequests } from './requests/sessions'

export interface Watched {
  focused(session: string): boolean
  snapshot(session: string): LiveSnapshot | undefined
}

const backFromSnooze = ({ snoozed }: Session) => snoozed !== null && snoozed <= Date.now()

const openedPatch = (session: Session): ChatPatch => ({
  ...(!session.seen && { seen: true }),
  ...(backFromSnooze(session) && { snoozed: null }),
})

export const markSeen = (sessions: Sessions, id: string) => {
  const session = sessions.open(id)
  const patch = session && openedPatch(session)
  if (patch && Object.keys(patch).length > 0) sessions.update(id, patch)
}

export const serveThreads = (ctx: ServerContext, sessions: Sessions, wire: Pick<WireHost, 'handle'>, watched: Watched) =>
  joinDisposers(
    ctx.on(sessionUpdate, session => {
      if (!session.seen && watched.focused(session.id)) markSeen(sessions, session.id)
    }),
    sessionRequests(sessions, wire),
    pagingRequests(ctx, sessions, wire, watched.snapshot),
  )

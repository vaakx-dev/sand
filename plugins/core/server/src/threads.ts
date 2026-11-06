import { sessionUpdate, type Sessions } from '@sand/chats/contract'
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

export const markSeen = (sessions: Sessions, session: string) => {
  if (sessions.open(session)?.seen === false) sessions.update(session, { seen: true })
}

export const serveThreads = (ctx: ServerContext, sessions: Sessions, wire: Pick<WireHost, 'handle'>, watched: Watched) =>
  joinDisposers(
    ctx.on(sessionUpdate, session => {
      if (!session.seen && watched.focused(session.id)) markSeen(sessions, session.id)
    }),
    sessionRequests(sessions, wire),
    pagingRequests(ctx, sessions, wire, watched.snapshot),
  )

import type { Session } from '@sand/sessions-sqlite/contract'
import type { OpenedSession } from '../contract'
import type { ServerContext } from '../context'
import type { LiveTracker } from '../live/track'
import { info } from '../socket/serialize'
import { openSession } from './open'
import type { CoreHandlers } from './registry'
import { tailOf } from './tail'

const pageLimit = 200

export const pagingRequests = (ctx: ServerContext, live: LiveTracker): CoreHandlers => {
  const session = (id: string) => openSession(ctx, id)
  const opened = (found: Session, rest: Pick<OpenedSession, 'entries' | 'partial' | 'carried'>) => {
    const base: OpenedSession = { info: info(found), ...rest, settings: ctx.modelSettings?.state(found), ...live.snapshot(found.id) }
    return ctx.waterfall('session.opened', base, found)
  }
  return {
    'session.open': async request => {
      const found = session(request.session)
      return opened(found, request.tail ? await tailOf(ctx, found) : { entries: found.entries() })
    },
    'session.page': request => {
      const limit = Math.floor(Number(request.limit))
      const size = limit > 0 ? { entries: Math.min(pageLimit, limit) } : {}
      return session(request.session).page(request.before, size)
    },
    'session.since': request => {
      const found = session(request.session)
      const entries = found.since(request.after)
      return entries ? opened(found, { entries }) : null
    },
    'session.entries': request => session(request.session).entries(),
    'sessions.children': request => ctx.sessions.children(request.parent),
  }
}

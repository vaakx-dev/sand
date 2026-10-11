import type { WireHandlers } from '@sand/protocol'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { Context } from 'drydock'
import type { OpenedSession } from '../contract'
import type { ServerContext } from '../context'
import { info } from '../socket/serialize'
import type { LiveTracker } from '../stream/live'

const pageLimit = 200
const baseCarried = ['settings']

export const tailOf = async (ctx: Context, session: Session) => {
  const { entries, more } = session.page()
  const oldest = entries[0]
  const carried = more && oldest ? session.carried(oldest.id, await ctx.waterfall('session.carry', baseCarried)) : []
  return { entries, partial: true, ...(carried.length && { carried }) }
}

export const pagingRequests = (ctx: ServerContext, live: LiveTracker): WireHandlers => {
  const session = (id: string) => ctx.sessions.require(id)
  const opened = (found: Session, rest: Pick<OpenedSession, 'entries' | 'partial' | 'carried'>) => {
    const base: OpenedSession = { info: info(found), ...rest, settings: ctx.modelSettings?.state(found), ...live.snapshot(found.id) }
    return ctx.waterfall('session.opened', base, found)
  }
  return {
    'session.open': async request => {
      const found = session(request.session)
      return opened(found, await tailOf(ctx, found))
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

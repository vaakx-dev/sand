import type { Session } from '@sand/chats/contract'
import type { WireHost } from '@sand/host-hub/contract'
import { sessionOpened } from '@sand/loop/contract'
import { modelSettings } from '@sand/model/contract'
import { joinDisposers } from '@sand/util'
import type { ContextCore } from 'drydock'
import { sessionCarry } from '../contract'
import type { OpenedSession } from '../contract/relay'
import { sessionEntries, sessionOpen, sessionPage, sessionSince } from '../contract/requests'
import type { ServerContext } from '../context'
import { info } from '../socket/serialize'
import type { LiveTracker } from '../stream/live'

const pageLimit = 200
const baseCarried = ['settings']

const tailOf = async (ctx: ContextCore, session: Session) => {
  const { entries, more } = session.page()
  const oldest = entries[0]
  const carried = more && oldest ? session.carried(oldest.id, await ctx.waterfall(sessionCarry, baseCarried)) : []
  return { entries, partial: true, ...(carried.length && { carried }) }
}

export const pagingRequests = (ctx: ServerContext, wire: Pick<WireHost, 'handle'>, live: LiveTracker) => {
  const session = (id: string) => ctx.sessions.require(id)
  const opened = (found: Session, rest: Pick<OpenedSession, 'entries' | 'partial' | 'carried'>) => {
    const settings = ctx.get(modelSettings)?.state(found)
    const base: OpenedSession = { info: info(found), ...rest, settings, ...live.snapshot(found.id) }
    return ctx.waterfall(sessionOpened, base, found)
  }
  return joinDisposers(
    wire.handle(sessionOpen, async request => {
      const found = session(request.session)
      return opened(found, await tailOf(ctx, found))
    }),
    wire.handle(sessionPage, request => {
      const limit = Math.floor(Number(request.limit))
      const size = limit > 0 ? { entries: Math.min(pageLimit, limit) } : {}
      return session(request.session).page(request.before, size)
    }),
    wire.handle(sessionSince, request => {
      const found = session(request.session)
      const entries = found.since(request.after)
      return entries ? opened(found, { entries }) : null
    }),
    wire.handle(sessionEntries, request => session(request.session).entries()),
  )
}

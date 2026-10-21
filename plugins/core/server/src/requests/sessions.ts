import type { WireHost } from '@sand/host-hub/contract'
import { joinDisposers } from '@sand/util'
import { existsSync } from 'node:fs'
import {
  loopInterrupt,
  loopRun,
  sessionAppend,
  sessionCheckout,
  sessionMove,
  sessionPin,
  sessionRemove,
  sessionRename,
  sessionSettle,
  sessionSnooze,
  sessionsList,
  sessionsQuick,
  sessionsCreate,
} from '../contract/requests'
import type { ServerContext } from '../context'
import { info } from '../socket/serialize'

export const sessionRequests = (ctx: ServerContext, wire: Pick<WireHost, 'handle'>) => {
  const session = (id: string) => ctx.sessions.require(id)
  const done = () => true
  return joinDisposers(
    wire.handle(sessionsList, () => ctx.sessions.list()),
    wire.handle(sessionsCreate, ({ cwd }) => {
      if (!existsSync(cwd)) throw new Error(`${cwd} is not a folder on this PC`)
      return info(ctx.sessions.thread(cwd))
    }),
    wire.handle(sessionsQuick, () => info(ctx.sessions.quick())),
    wire.handle(sessionRename, ({ session, title }) => {
      ctx.sessions.rename(session, title)
      return true
    }),
    wire.handle(sessionRemove, ({ session }) => ctx.sessions.remove(session).then(done)),
    wire.handle(sessionPin, ({ session, pinned }) => Boolean(ctx.sessions.pin(session, pinned))),
    wire.handle(sessionSettle, ({ session, settled }) => ctx.sessions.settle(session, settled).then(done)),
    wire.handle(sessionSnooze, ({ session, until }) => Boolean(ctx.sessions.snooze(session, until))),
    wire.handle(sessionMove, ({ session, position }) => Boolean(ctx.sessions.move(session, position))),
    wire.handle(sessionAppend, ({ session: id, entry }) => {
      session(id).append(entry.type, entry.data, entry.id)
      return true
    }),
    wire.handle(sessionCheckout, ({ session: id, entry }) => {
      session(id).checkout(entry)
      return true
    }),
    wire.handle(loopRun, ({ session: id, prompt }) => ctx.loop.run(session(id), prompt)),
    wire.handle(loopInterrupt, ({ session: id }) => ctx.loop.interrupt(session(id))),
  )
}

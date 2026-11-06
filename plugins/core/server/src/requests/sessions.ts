import type { Sessions } from '@sand/chats/contract'
import type { WireHost } from '@sand/host-hub/contract'
import { joinDisposers } from '@sand/util'
import { existsSync } from 'node:fs'
import {
  sessionAppend,
  sessionBranches,
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
import { info } from '../socket/serialize'

export const sessionRequests = (sessions: Sessions, wire: Pick<WireHost, 'handle'>) => {
  const session = (id: string) => sessions.require(id)
  const done = () => true
  return joinDisposers(
    wire.handle(sessionsList, () => sessions.list()),
    wire.handle(sessionsCreate, ({ cwd }) => {
      if (!existsSync(cwd)) throw new Error(`${cwd} is not a folder on this PC`)
      return info(sessions.thread(cwd))
    }),
    wire.handle(sessionsQuick, () => info(sessions.quick())),
    wire.handle(sessionRename, ({ session, title }) => {
      sessions.rename(session, title)
      return true
    }),
    wire.handle(sessionRemove, ({ session }) => sessions.remove(session).then(done)),
    wire.handle(sessionPin, ({ session, pinned }) => Boolean(sessions.pin(session, pinned))),
    wire.handle(sessionSettle, ({ session, settled }) => sessions.settle(session, settled).then(done)),
    wire.handle(sessionSnooze, ({ session, until }) => Boolean(sessions.snooze(session, until))),
    wire.handle(sessionMove, ({ session, position }) => Boolean(sessions.move(session, position))),
    wire.handle(sessionAppend, ({ session: id, entry }) => {
      session(id).append(entry.type, entry.data, { id: entry.id })
      return true
    }),
    wire.handle(sessionCheckout, ({ session: id, entry }) => {
      session(id).checkout(entry)
      return true
    }),
    wire.handle(sessionBranches, ({ session: id, entry }) => session(id).branches(entry)),
  )
}

import type { Sessions } from '@sand/chats/contract'
import type { WireHost } from '@sand/host-hub/contract'
import { joinDisposers } from '@sand/util'
import { existsSync } from 'node:fs'
import {
  sessionBranches,
  sessionCheckout,
  sessionRemove,
  sessionsQuick,
  sessionsCreate,
} from '../contract/requests'
import { info } from '../socket/serialize'

export const sessionRequests = (sessions: Sessions, wire: Pick<WireHost, 'handle'>) => {
  const session = (id: string) => sessions.require(id)
  const done = () => true
  return joinDisposers(
    wire.handle(sessionsCreate, ({ cwd }) => {
      if (!existsSync(cwd)) throw new Error(`${cwd} is not a folder on this PC`)
      return info(sessions.thread(cwd))
    }),
    wire.handle(sessionsQuick, () => info(sessions.quick())),
    wire.handle(sessionRemove, ({ session }) => sessions.remove(session).then(done)),
    wire.handle(sessionCheckout, ({ session: id, entry }) => {
      session(id).checkout(entry)
      return true
    }),
    wire.handle(sessionBranches, ({ session: id, entry }) => session(id).branches(entry)),
  )
}

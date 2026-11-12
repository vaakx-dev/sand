import type { Sessions } from '@sand/chats/contract'
import type { WireHost } from '@sand/host-hub/contract'
import { joinDisposers } from '@sand/util'
import { sessionBranches, sessionCheckout, sessionRemove } from '../contract/requests'

export const sessionRequests = (sessions: Sessions, wire: Pick<WireHost, 'handle'>) => {
  const session = (id: string) => sessions.require(id)
  const done = () => true
  return joinDisposers(
    wire.handle(sessionRemove, ({ session }) => sessions.remove(session).then(done)),
    wire.handle(sessionCheckout, ({ session: id, entry }) => {
      session(id).checkout(entry)
      return true
    }),
    wire.handle(sessionBranches, ({ session: id, entry }) => session(id).branches(entry)),
  )
}

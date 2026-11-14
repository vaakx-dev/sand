import type { Sessions } from '@sand/chats/contract'
import type { WireHost } from '@sand/host-hub/contract'
import { joinDisposers } from '@sand/util'
import { sessionCheckout, sessionForks, sessionRemove } from '../contract/requests'

export const sessionRequests = (sessions: Sessions, wire: Pick<WireHost, 'handle'>) => {
  const session = (id: string) => sessions.require(id)
  const done = () => true
  const remove = (id: string) => {
    if (sessions.open(id)?.kind === 'bot') throw new Error("A bot's chat goes when you delete the bot")
    return sessions.remove(id).then(done)
  }
  return joinDisposers(
    wire.handle(sessionRemove, ({ session: id }) => remove(id)),
    wire.handle(sessionCheckout, ({ session: id, entry }) => {
      session(id).checkout(entry)
      return true
    }),
    wire.handle(sessionForks, ({ session: id }) => session(id).forks()),
  )
}

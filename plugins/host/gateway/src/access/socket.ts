import { deviceParams } from '@sand/devices-contract'
import { textReply } from '@sand/util/host'
import type { Visitor } from '../http/peer'
import { unauthorized } from '../http/reply'
import type { Tickets } from './keys'
import type { Sessions } from './sessions'

export const createSocketRoute = (tickets: Pick<Tickets, 'take'>, sessions: Pick<Sessions, 'create'>) => (request: Request, peer: Visitor) => {
  const ticket = new URL(request.url).searchParams.get(deviceParams.ticket)
  const caller = ticket ? tickets.take(ticket) : undefined
  if (!caller) return unauthorized()
  const session = sessions.create(caller)
  const opened = peer.upgrade({ caller: { device: caller.device, kind: caller.kind }, session })
  return opened ? undefined : textReply('expected a websocket', 400)
}

import { server, sessionOpened } from '@sand/server/contract'
import {
  helloTurns,
  turnChange,
  turnChangeWire,
  type TurnInfo,
  turnPending,
  turnPendingWire,
  type Turns,
} from '@sand/turns-contract/contract'
import { joinDisposers } from '@sand/util'
import type { TurnsContext } from './context'

export const serveTurns = (ctx: TurnsContext, service: Turns, live: () => TurnInfo[]) => {
  const byChat = () => Object.fromEntries(live().map(info => [info.session, info]))

  ctx.on(sessionOpened, (opened, chat) => ({ ...opened, pending: service.pending(chat) }))
  ctx.watch(server, found => {
    if (!found) return
    return joinDisposers(
      found.hello(helloTurns, byChat, { fresh: true }),
      ctx.on(turnChange, info => found.broadcast(turnChangeWire, [{ $session: { id: info.session } }, info])),
      ctx.on(turnPending, chat => found.broadcast(turnPendingWire, [chat.id, service.pending(chat)])),
    )
  })
}

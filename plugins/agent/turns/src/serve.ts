import { server, sessionOpened } from '@sand/server/contract'
import {
  helloSending,
  helloTurns,
  type Sending,
  sendingChange,
  sendingSet,
  turnChange,
  turnChangeWire,
  type TurnInfo,
  turnPending,
  turnPendingWire,
  type Turns,
} from '@sand/turns-contract/contract'
import { joinDisposers } from '@sand/util'
import type { TurnsContext } from './context'

interface SendingSetting {
  current(): Sending
  set(next: Sending): Promise<Sending>
}

export const serveTurns = (ctx: TurnsContext, service: Turns, live: () => TurnInfo[], sending: SendingSetting) => {
  const byChat = () => Object.fromEntries(live().map(info => [info.session, info]))

  ctx.on(sessionOpened, (opened, chat) => ({ ...opened, pending: service.pending(chat) }))
  ctx.watch(server, found => {
    if (!found) return
    return joinDisposers(
      found.hello(helloTurns, byChat, { fresh: true }),
      found.hello(helloSending, sending.current),
      found.handle(sendingSet, async next => {
        const saved = await sending.set(next)
        found.broadcast(sendingChange, saved)
        return saved
      }),
      ctx.on(turnChange, info => found.broadcast(turnChangeWire, [{ $session: { id: info.session } }, info])),
      ctx.on(turnPending, chat => found.broadcast(turnPendingWire, [chat.id, service.pending(chat)])),
    )
  })
}

import type { Session } from '@sand/chats/contract'
import type { Runner } from '@sand/engine/contract'
import { server, sessionOpened, userWrote } from '@sand/server/contract'
import {
  helloTurns,
  helloTurnsApi,
  turnChange,
  turnChangeWire,
  turnHold,
  turnInterrupt,
  turnPending,
  turnPendingWire,
  type Turns,
  turnSend,
  turnWithdraw,
} from '@sand/turns-contract/contract'
import { joinDisposers } from '@sand/util'
import type { TurnsContext } from './context'
import { threadTurn } from './conversations'

export interface Served {
  service: Turns
  runner: Runner<Session>
}

export const serveTurns = (ctx: TurnsContext, { service, runner }: Served) => {
  const session = (id: string) => ctx.sessions.require(id)
  const live = () => Object.fromEntries(runner.live().map(info => [info.conversation, threadTurn(info)]))

  ctx.on(sessionOpened, (opened, chat) => ({ ...opened, pending: service.pending(chat) }))
  ctx.watch(server, found => {
    if (!found) return
    return joinDisposers(
      found.hello(helloTurns, live, { fresh: true }),
      found.hello(helloTurnsApi, () => 1),
      ctx.on(turnChange, info => found.broadcast(turnChangeWire, [{ $session: { id: info.session } }, info])),
      ctx.on(turnPending, chat => found.broadcast(turnPendingWire, [chat.id, service.pending(chat)])),
      found.handle(turnSend, ({ session: id, ...input }) => {
        const chat = session(id)
        if ((input.origin ?? 'user') === 'user') ctx.emit(userWrote, chat)
        return service.send(chat, input)
      }),
      found.handle(turnInterrupt, ({ session: id, turn }) => service.interrupt(session(id), turn)),
      found.handle(turnWithdraw, ({ session: id, pending }) => service.withdraw(session(id), pending)),
      found.handle(turnHold, ({ session: id, pending, held }) => runner.hold(session(id), pending, held)),
    )
  })
}

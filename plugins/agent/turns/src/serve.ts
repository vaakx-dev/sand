import type { Session } from '@sand/chats/contract'
import { server, sessionOpened, userWrote } from '@sand/server/contract'
import {
  helloTurns,
  helloTurnsApi,
  turnChange,
  turnChangeWire,
  turnGet,
  turnHold,
  turnInterrupt,
  turnList,
  turnPending,
  turnPendingList,
  turnPendingWire,
  type Turns,
  turnSend,
  turnWait,
  turnWithdraw,
} from '@sand/turns-contract/contract'
import { joinDisposers } from '@sand/util'
import type { TurnsContext } from './context'
import type { TurnStore } from './store/turns'

export interface Served {
  service: Turns
  store: TurnStore
  hold(session: Session, pending: string, held: boolean): boolean
}

const waitFor = 25_000

export const serveTurns = (ctx: TurnsContext, { service, store, hold }: Served) => {
  const session = (id: string) => ctx.sessions.require(id)
  const own = (chat: string, turn: string) => {
    const info = store.get(turn)
    if (info?.session !== chat) throw new Error(`No turn ${turn} in this chat`)
    return info
  }
  const live = () => Object.fromEntries(store.live().map(info => [info.session, info]))

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
      found.handle(turnHold, ({ session: id, pending, held }) => hold(session(id), pending, held)),
      found.handle(turnGet, ({ session: id, turn }) => (turn ? own(id, turn) : store.list(id, undefined, 1)[0]) ?? null),
      found.handle(turnList, ({ session: id, before, limit }) => store.list(id, before, limit)),
      found.handle(turnWait, ({ session: id, turn, until, timeoutMs = waitFor }) => {
        own(id, turn)
        return service.wait(turn, until, AbortSignal.timeout(timeoutMs))
      }),
      found.handle(turnPendingList, ({ session: id }) => service.pending(session(id))),
    )
  })
}

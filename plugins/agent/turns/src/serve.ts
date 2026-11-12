import type { Session } from '@sand/chats/contract'
import type { Runner } from '@sand/engine/contract'
import { server, sessionOpened } from '@sand/server/contract'
import {
  helloTurns,
  turnChange,
  turnChangeWire,
  turnPending,
  turnPendingWire,
  type Turns,
} from '@sand/turns-contract/contract'
import { joinDisposers } from '@sand/util'
import type { TurnsContext } from './context'
import { threadTurn } from './conversations'

export interface Served {
  service: Turns
  runner: Runner<Session>
}

export const serveTurns = (ctx: TurnsContext, { service, runner }: Served) => {
  const live = () => Object.fromEntries(runner.live().map(info => [info.conversation, threadTurn(info)]))

  ctx.on(sessionOpened, (opened, chat) => ({ ...opened, pending: service.pending(chat) }))
  ctx.watch(server, found => {
    if (!found) return
    return joinDisposers(
      found.hello(helloTurns, live, { fresh: true }),
      ctx.on(turnChange, info => found.broadcast(turnChangeWire, [{ $session: { id: info.session } }, info])),
      ctx.on(turnPending, chat => found.broadcast(turnPendingWire, [chat.id, service.pending(chat)])),
    )
  })
}

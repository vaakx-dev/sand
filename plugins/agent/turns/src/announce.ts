import type { Session } from '@sand/chats/contract'
import { turnChange, turnPending } from '@sand/turns-contract/contract'
import type { TurnsContext } from './context'
import type { TurnStore } from './store/turns'

export const createAnnounce = (ctx: TurnsContext, turns: TurnStore) => ({
  turn(id: string) {
    const info = turns.get(id)
    if (info) ctx.emit(turnChange, info)
  },
  pending: (session: Session) => ctx.emit(turnPending, session),
})

export type Announce = ReturnType<typeof createAnnounce>

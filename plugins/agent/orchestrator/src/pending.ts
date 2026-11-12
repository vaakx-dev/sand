import type { Session } from '@sand/chats/contract'
import type { OrchestratorContext } from './context'
import type { PendingAction } from './contract'

export const changePending = (ctx: OrchestratorContext, session: Session, pending: string, action: PendingAction) => {
  switch (action) {
    case 'withdraw':
      return ctx.turns.withdraw(session, pending)
    case 'hold':
      return ctx.turns.hold(session, pending, true)
    case 'release':
      return ctx.turns.hold(session, pending, false)
  }
}

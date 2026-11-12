import { sessionSettle } from '@sand/chats/contract'
import type { OrchestratorContext } from './context'
import { stopThread } from './stop'

export const settleSubagents = (ctx: OrchestratorContext) =>
  ctx.on(sessionSettle, parent => {
    if (parent.settled === null) return
    for (const child of ctx.sessions.children(parent.id)) {
      if (child.settled !== null) continue
      const session = ctx.sessions.require(child.id)
      stopThread(ctx, session)
        .then(() => ctx.sessions.settle(child.id, true))
        .catch(error => ctx.report(error))
    }
  })
